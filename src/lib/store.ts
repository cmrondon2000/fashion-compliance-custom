import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateProduct } from "./compliance";

export type ComplianceStatus = "compliant" | "pending" | "non-compliant" | "review";

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact: string;
  email: string;
  certifications: string[];
  status: ComplianceStatus;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  material: string;
  status: ComplianceStatus;
  updated_at: string;
}

/**
 * Compliance status logic — derive a product's initial status from its
 * supplier's status. A product can never be more compliant than its supplier.
 */
export function deriveStatusFromSupplier(
  supplierStatus: ComplianceStatus | undefined,
): ComplianceStatus {
  if (!supplierStatus) return "pending";
  if (supplierStatus === "non-compliant") return "non-compliant";
  if (supplierStatus === "review") return "review";
  if (supplierStatus === "pending") return "pending";
  return "compliant";
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useSuppliers() {
return useQuery({
    queryKey: ["suppliers"],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        certifications: Array.isArray(s.certifications)
          ? s.certifications
          : typeof s.certifications === "string" && s.certifications.length > 0
          ? s.certifications.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [],
      })) as Supplier[];
    },
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<Product, "id" | "updated_at">) => {
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("status,certifications,name")
        .eq("name", p.supplier)
        .maybeSingle();
      
      const supplier = supplierData ? {
        ...supplierData,
        certifications: Array.isArray(supplierData.certifications)
          ? supplierData.certifications
          : typeof supplierData.certifications === "string" && supplierData.certifications.length > 0
          ? supplierData.certifications.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [],
      } : undefined;

      const { status } = validateProduct(p, supplier);
      const { error } = await supabase.from("products").insert({ ...p, status });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}


export function useAddSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<Supplier, "id" | "updated_at">) => {
      const { error } = await supabase.from("suppliers").insert(s);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Product> & { id: string }) => {
      // Re-validate using the (possibly updated) supplier + material.
      const { data: existing } = await supabase
        .from("products").select("supplier,material").eq("id", id).maybeSingle();
      const supplierName = patch.supplier ?? existing?.supplier ?? "";
      const material = patch.material ?? existing?.material ?? "";
      const { data: supplier } = await supabase
        .from("suppliers").select("status,certifications,name")
        .eq("name", supplierName).maybeSingle();
      const { status } = validateProduct({ material }, supplier ?? undefined);
      const { error } = await supabase
        .from("products").update({ ...patch, status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Supplier> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("suppliers").update(patch).eq("id", id)
        .select("name,status,certifications").maybeSingle();
      if (error) throw error;
      if (!updated) return;
      // Cascade: re-validate every product linked to this supplier.
      const { data: products } = await supabase
        .from("products").select("id,material").eq("supplier", updated.name);
      if (products && products.length > 0) {
        await Promise.all(products.map((p) => {
          const { status } = validateProduct({ material: p.material }, updated);
          return supabase.from("products").update({ status }).eq("id", p.id);
        }));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
