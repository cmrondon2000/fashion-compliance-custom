import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useProducts,
  useSuppliers,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  deriveStatusFromSupplier,
  type ComplianceStatus,
  type Supplier,
  type Product,
} from "@/lib/store";
import { validateProduct } from "@/lib/compliance";
import { useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Fashion API Compliance" },
      { name: "description", content: "Register products and track their compliance status." },
    ],
  }),
  component: ProductsPage,
});

const statusEnum = z.enum(["compliant", "pending", "non-compliant", "review"]);
const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120, "Max 120 characters"),
  sku: z.string().trim().min(2, "SKU must be at least 2 characters").max(40, "Max 40 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, - and _"),
  category: z.string().trim().min(1, "Category is required").max(40),
  supplier: z.string().trim().min(1, "Supplier is required").max(120),
  material: z.string().trim().max(200, "Max 200 characters"),
  status: statusEnum,
});
type ProductForm = z.infer<typeof productSchema>;

const PAGE_SIZE = 10;

function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const deleteProduct = useDeleteProduct();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplianceStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return products.filter((p) => {
      const matchQ = !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.supplier.toLowerCase().includes(term);
      const matchS = statusFilter === "all" || p.status === statusFilter;
      const matchC = categoryFilter === "all" || p.category === categoryFilter;
      return matchQ && matchS && matchC;
    });
  }, [products, q, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your product catalog and compliance.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> New product
          </button>
        </div>

        <Toolbar
          q={q}
          onQ={(v) => { setQ(v); setPage(1); }}
          statusFilter={statusFilter}
          onStatus={(v) => { setStatusFilter(v); setPage(1); }}
          categoryFilter={categoryFilter}
          onCategory={(v) => { setCategoryFilter(v); setPage(1); }}
          categories={categories}
          count={filtered.length}
        />

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 text-muted-foreground">
                <tr className="text-left">
                  {["Product", "SKU", "Category", "Supplier", "Material", "Status", "Updated", ""].map((h, i) => (
                    <th key={i} className={`px-5 py-3.5 font-medium text-xs uppercase tracking-wider border-b border-border ${i === 7 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((p, idx) => {
                  const supplier = suppliers.find((s) => s.name === p.supplier);
                  const { issues } = validateProduct(p, supplier);
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-muted/40">
                      <td className={`px-5 py-3.5 font-medium ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>{p.name}</td>
                      <td className={`px-5 py-3.5 text-muted-foreground font-mono text-xs ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>{p.sku}</td>
                      <td className={`px-5 py-3.5 ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>
                        <span className="inline-flex items-center rounded-full bg-secondary/70 px-2.5 py-0.5 text-xs">{p.category}</span>
                      </td>
                      <td className={`px-5 py-3.5 ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>{p.supplier}</td>
                      <td className={`px-5 py-3.5 text-muted-foreground max-w-[220px] truncate ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`} title={p.material}>{p.material}</td>
                      <td className={`px-5 py-3.5 ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={p.status} />
                          {issues.length > 0 && (
                            <span title={issues.join("\n")} className="text-amber-500">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-muted-foreground text-xs ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>{p.updated_at?.slice(0, 10)}</td>
                      <td className={`px-5 py-3.5 ${idx !== paged.length - 1 ? "border-b border-border/60" : ""}`}>
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-accent" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"?`)) {
                                deleteProduct.mutate(p.id, {
                                  onSuccess: () => toast.success("Product deleted"),
                                  onError: (err) => toast.error(err.message),
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                            aria-label="Delete"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">
                    {isLoading ? "Loading..." : "No products found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={currentPage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {creating && <ProductFormModal suppliers={suppliers} onClose={() => setCreating(false)} />}
      {editing && <ProductFormModal suppliers={suppliers} product={editing} onClose={() => setEditing(null)} />}
    </AppLayout>
  );
}

function Toolbar({
  q, onQ, statusFilter, onStatus, categoryFilter, onCategory, categories, count,
}: {
  q: string; onQ: (v: string) => void;
  statusFilter: "all" | ComplianceStatus; onStatus: (v: "all" | ComplianceStatus) => void;
  categoryFilter: string; onCategory: (v: string) => void;
  categories: string[]; count: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search by name, SKU, supplier..."
          className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatus(e.target.value as "all" | ComplianceStatus)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">All statuses</option>
        <option value="compliant">Compliant</option>
        <option value="review">In review</option>
        <option value="pending">Pending</option>
        <option value="non-compliant">Non-compliant</option>
      </select>
      <select
        value={categoryFilter}
        onChange={(e) => onCategory(e.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="ml-auto text-xs text-muted-foreground">{count} result{count === 1 ? "" : "s"}</div>
    </div>
  );
}

function Pager({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (n: number) => void }) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 bg-muted/20 text-xs text-muted-foreground">
      <div>Showing <span className="font-medium text-foreground">{start}–{end}</span> of <span className="font-medium text-foreground">{total}</span></div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        ><ChevronLeft className="h-3.5 w-3.5" /> Prev</button>
        <span className="px-2">Page <span className="font-medium text-foreground">{page}</span> of {totalPages}</span>
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >Next <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function ProductFormModal({
  suppliers,
  product,
  onClose,
}: {
  suppliers: Supplier[];
  product?: Product;
  onClose: () => void;
}) {
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const isEdit = !!product;

  const [form, setForm] = useState<ProductForm>({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "Tops",
    supplier: product?.supplier ?? suppliers[0]?.name ?? "",
    material: product?.material ?? "",
    status:
      (product?.status as ComplianceStatus | undefined) ??
      deriveStatusFromSupplier(suppliers[0]?.status),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

  const onSupplierChange = (name: string) => {
    const s = suppliers.find((x) => x.name === name);
    setForm((f) => ({
      ...f,
      supplier: name,
      status: isEdit ? f.status : deriveStatusFromSupplier(s?.status),
    }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = productSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ProductForm;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (isEdit) {
      updateProduct.mutate(
        { id: product!.id, ...result.data },
        {
          onSuccess: () => { toast.success("Product updated"); onClose(); },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      addProduct.mutate(result.data, {
        onSuccess: () => { toast.success("Product registered"); onClose(); },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const pending = addProduct.isPending || updateProduct.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{isEdit ? "Edit product" : "Register product"}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
          <Field label="Product name" error={errors.name}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls(!!errors.name)} maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" error={errors.sku}>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls(!!errors.sku)} maxLength={40} />
            </Field>
            <Field label="Category" error={errors.category}>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls(!!errors.category)}>
                {["Tops", "Outerwear", "Knitwear", "Bags", "Accessories", "Footwear"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Supplier" error={errors.supplier}>
            <select value={form.supplier} onChange={(e) => onSupplierChange(e.target.value)} className={inputCls(!!errors.supplier)}>
              {suppliers.length === 0 && <option value="">No suppliers yet</option>}
              {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Material composition" error={errors.material}>
            <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. Organic Cotton 100%" className={inputCls(!!errors.material)} maxLength={200} />
          </Field>
          <Field label="Compliance status" error={errors.status}>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ComplianceStatus })} className={inputCls(!!errors.status)}>
              <option value="pending">Pending</option>
              <option value="review">In review</option>
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-compliant</option>
            </select>
          </Field>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
            <button type="submit" disabled={pending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {pending ? "Saving..." : isEdit ? "Save changes" : "Save product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = (err = false) =>
  `w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${err ? "border-destructive" : "border-border"}`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
