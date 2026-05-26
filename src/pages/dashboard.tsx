import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useProducts, useSuppliers, type ComplianceStatus } from "@/lib/store";
import { Package, Truck, ShieldCheck, AlertTriangle, TrendingUp, ArrowUpRight, Sparkles } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Trend = { value: number; up: boolean };

function StatCard({
  label, value, icon: Icon, gradient, trend, sparkline, delay = 0,
}: {
  label: string; value: string | number; icon: typeof Package;
  gradient: string; trend?: Trend; sparkline?: number[]; delay?: number;
}) {
  const data = (sparkline ?? []).map((v, i) => ({ i, v }));
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_20px_40px_-12px_rgba(15,23,42,0.18)] animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
      <div className={cn("pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90", gradient)} />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg ring-1 ring-white/30", gradient)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
          {trend && (
            <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
              <TrendingUp className={cn("h-3 w-3", !trend.up && "rotate-180")} />
              {trend.up ? "+" : "−"}{trend.value}% wk
            </div>
          )}
        </div>
        {data.length > 0 && (
          <div className="h-14 w-28">
            <ChartContainer config={{ v: { color: "var(--color-primary)" } }} className="h-full w-full aspect-auto">
              <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-v)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-v)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="var(--color-v)" strokeWidth={2} fill={`url(#sp-${label})`} />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </div>
  );
}

const statusOrder: ComplianceStatus[] = ["compliant", "review", "pending", "non-compliant"];
const statusColor: Record<ComplianceStatus, string> = {
  compliant: "var(--color-success)", review: "var(--color-info)",
  pending: "var(--color-warning)", "non-compliant": "var(--color-destructive)",
};
const statusLabel: Record<ComplianceStatus, string> = {
  compliant: "Compliant", review: "In review",
  pending: "Pending", "non-compliant": "Non-compliant",
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const compliant = products.filter((p) => p.status === "compliant").length;
  const issues = products.filter((p) => p.status === "non-compliant").length;
  const rate = products.length ? Math.round((compliant / products.length) * 100) : 0;

  const breakdown = statusOrder.map((s) => ({
    status: s, label: statusLabel[s],
    value: products.filter((p) => p.status === s).length,
    fill: statusColor[s],
  }));

  const byCategory = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      const key = p.category || "Uncategorized";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([category, count]) => ({ category, count })).slice(0, 6);

  const spark = (seed: number) =>
    Array.from({ length: 8 }, (_, i) => Math.max(1, Math.round(seed * (0.6 + Math.sin(i + seed) * 0.25 + i * 0.05))));

  const pieConfig: ChartConfig = {
    value: { label: "Products" },
    ...Object.fromEntries(statusOrder.map((s) => [s, { label: statusLabel[s], color: statusColor[s] }])),
  };
  const barConfig: ChartConfig = { count: { label: "Products", color: "var(--color-primary)" } };

  return (
    <AppLayout>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-400/20 blur-[120px]" />
        <div className="absolute top-1/4 -right-20 h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[22rem] w-[22rem] rounded-full bg-cyan-400/10 blur-[120px]" />
      </div>
      <div className="relative space-y-8 max-w-7xl mx-auto animate-fade-in">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-violet-500" /> Compliance overview
            </div>
            <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Welcome back</h1>
            <p className="text-muted-foreground text-[15px]">Track suppliers, certifications, and product compliance at a glance.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/products" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/60 dark:bg-white/5 backdrop-blur px-3.5 py-2 text-sm font-medium hover:bg-accent transition-all hover:-translate-y-0.5">
              Products <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/suppliers" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white px-3.5 py-2 text-sm font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5">
              Suppliers <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Products" value={products.length} icon={Package} gradient="bg-gradient-to-br from-indigo-500 to-violet-600" trend={{ value: 8, up: true }} sparkline={spark(products.length || 3)} delay={0} />
          <StatCard label="Suppliers" value={suppliers.length} icon={Truck} gradient="bg-gradient-to-br from-sky-500 to-cyan-600" trend={{ value: 3, up: true }} sparkline={spark(suppliers.length || 2)} delay={60} />
          <StatCard label="Compliance" value={`${rate}%`} icon={ShieldCheck} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" trend={{ value: 2, up: rate >= 70 }} sparkline={spark(Math.max(1, rate / 12))} delay={120} />
          <StatCard label="Open issues" value={issues} icon={AlertTriangle} gradient="bg-gradient-to-br from-rose-500 to-pink-600" trend={{ value: 1, up: false }} sparkline={spark(issues || 1)} delay={180} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold tracking-tight">Status breakdown</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Products by compliance state</p>
              </div>
            </div>
            {products.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No products yet.</div>
            ) : (
              <>
                <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[220px]">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={breakdown} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} strokeWidth={3} paddingAngle={2}>
                      {breakdown.map((d) => <Cell key={d.status} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="mt-4 space-y-2.5">
                  {breakdown.map((d) => (
                    <li key={d.status} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full ring-2 ring-offset-1 ring-offset-card" style={{ background: d.fill, boxShadow: `0 0 8px ${d.fill}` }} />
                        <span className="text-muted-foreground">{d.label}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </GlassCard>
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold tracking-tight">Products by category</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Top categories tracked</p>
              </div>
            </div>
            {byCategory.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Add products to see category distribution.</div>
            ) : (
              <ChartContainer config={barConfig} className="h-[260px] w-full aspect-auto">
                <BarChart data={byCategory} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.22 285)" stopOpacity={1} />
                      <stop offset="100%" stopColor="oklch(0.65 0.22 320)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <ChartTooltip cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="url(#bar-grad)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </GlassCard>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold tracking-tight">Recent products</h2>
              <Link to="/products" className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">All <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <ul className="space-y-1">
              {products.slice(0, 5).map((p) => (
                <li key={p.id} className="group/row -mx-2 px-2 py-2.5 rounded-xl flex items-center justify-between gap-4 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md ring-1 ring-white/20">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.sku} · {p.supplier}</div>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
              {products.length === 0 && <li className="py-6 text-sm text-muted-foreground">No products yet.</li>}
            </ul>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold tracking-tight">Suppliers</h2>
              <Link to="/suppliers" className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">All <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <ul className="space-y-1">
              {suppliers.slice(0, 5).map((s) => (
                <li key={s.id} className="group/row -mx-2 px-2 py-2.5 rounded-xl flex items-center justify-between gap-4 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white shadow-md ring-1 ring-white/20">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.country} · {s.certifications.length} certs</div>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
              {suppliers.length === 0 && <li className="py-6 text-sm text-muted-foreground">No suppliers yet.</li>}
            </ul>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}
