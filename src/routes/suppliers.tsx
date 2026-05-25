import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useSuppliers,
  useAddSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  type ComplianceStatus,
  type Supplier,
} from "@/lib/store";
import { useMemo, useState } from "react";
import { Plus, X, Mail, MapPin, Pencil, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Fashion API Compliance" },
      { name: "description", content: "Register and manage suppliers and certifications." },
    ],
  }),
  component: SuppliersPage,
});

const statusEnum = z.enum(["compliant", "pending", "non-compliant", "review"]);
const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(120, "Max 120 characters"),
  country: z.string().trim().max(80, "Max 80 characters"),
  contact: z.string().trim().max(120, "Max 120 characters"),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email").max(255)]),
  certifications: z.array(z.string().trim().min(1).max(40)).max(20, "Max 20 certifications"),
  status: statusEnum,
});
type SupplierForm = z.infer<typeof supplierSchema>;

const PAGE_SIZE = 10;

function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplianceStatus>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const countries = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.country).filter(Boolean))).sort(),
    [suppliers],
  );

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return suppliers.filter((s) => {
      const matchQ = !term ||
        s.name.toLowerCase().includes(term) ||
        s.contact.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.certifications.some((c) => c.toLowerCase().includes(term));
      const matchS = statusFilter === "all" || s.status === statusFilter;
      const matchC = countryFilter === "all" || s.country === countryFilter;
      return matchQ && matchS && matchC;
    });
  }, [suppliers, q, statusFilter, countryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Suppliers</h1>
            <p className="text-muted-foreground mt-1">Your network and their certifications.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> New supplier
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search suppliers, contacts, certifications..."
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "all" | ComplianceStatus); setPage(1); }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="compliant">Compliant</option>
            <option value="review">In review</option>
            <option value="pending">Pending</option>
            <option value="non-compliant">Non-compliant</option>
          </select>
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading suppliers...</p>}

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 text-muted-foreground">
                <tr className="text-left">
                  {["Supplier", "Country", "Contact", "Certifications", "Status", ""].map((h, i) => (
                    <th key={i} className={`px-5 py-3.5 font-medium text-xs uppercase tracking-wider border-b border-border ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((s, idx) => {
                  const last = idx === paged.length - 1;
                  const bd = last ? "" : "border-b border-border/60";
                  return (
                    <tr key={s.id} className="group transition-colors hover:bg-muted/40">
                      <td className={`px-5 py-3.5 font-medium ${bd}`}>{s.name}</td>
                      <td className={`px-5 py-3.5 ${bd}`}>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{s.country || "—"}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 ${bd}`}>
                        <div className="leading-tight">
                          <div>{s.contact || "—"}</div>
                          {s.email && (
                            <a href={`mailto:${s.email}`} className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" />{s.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 ${bd}`}>
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {s.certifications.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {s.certifications.slice(0, 4).map((c: string) => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-secondary/70 text-secondary-foreground">{c}</span>
                          ))}
                          {s.certifications.length > 4 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{s.certifications.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 ${bd}`}><StatusBadge status={s.status} /></td>
                      <td className={`px-5 py-3.5 ${bd}`}>
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg hover:bg-accent" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete supplier "${s.name}"?`)) {
                                deleteSupplier.mutate(s.id, {
                                  onSuccess: () => toast.success("Supplier deleted"),
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
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                    {isLoading ? "Loading..." : "No suppliers found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                ><ChevronLeft className="h-3.5 w-3.5" /> Prev</button>
                <span className="px-2">Page <span className="font-medium text-foreground">{currentPage}</span> of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >Next <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {creating && <SupplierFormModal onClose={() => setCreating(false)} />}
      {editing && <SupplierFormModal supplier={editing} onClose={() => setEditing(null)} />}
    </AppLayout>
  );
}

function SupplierFormModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const addSupplier = useAddSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEdit = !!supplier;

  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    country: supplier?.country ?? "",
    contact: supplier?.contact ?? "",
    email: supplier?.email ?? "",
    certifications: supplier?.certifications.join(", ") ?? "",
    status: (supplier?.status as ComplianceStatus | undefined) ?? "pending",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      country: form.country,
      contact: form.contact,
      email: form.email,
      certifications: form.certifications.split(",").map((c) => c.trim()).filter(Boolean),
      status: form.status,
    };
    const result = supplierSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof SupplierForm;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (isEdit) {
      updateSupplier.mutate(
        { id: supplier!.id, ...result.data },
        {
          onSuccess: () => { toast.success("Supplier updated"); onClose(); },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      addSupplier.mutate(result.data, {
        onSuccess: () => { toast.success("Supplier registered"); onClose(); },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const pending = addSupplier.isPending || updateSupplier.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{isEdit ? "Edit supplier" : "Register supplier"}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
          <Field label="Supplier name" error={errors.name}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls(!!errors.name)} maxLength={120} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country" error={errors.country}>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls(!!errors.country)} maxLength={80} />
            </Field>
            <Field label="Contact name" error={errors.contact}>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputCls(!!errors.contact)} maxLength={120} />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls(!!errors.email)} maxLength={255} />
          </Field>
          <Field label="Certifications (comma-separated)" error={errors.certifications}>
            <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="GOTS, OEKO-TEX" className={inputCls(!!errors.certifications)} />
          </Field>
          <Field label="Status" error={errors.status}>
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
              {pending ? "Saving..." : isEdit ? "Save changes" : "Save supplier"}
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
