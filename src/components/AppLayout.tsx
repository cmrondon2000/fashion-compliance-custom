import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Truck, Sparkles, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
] as const;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform md:translate-x-0",
          "bg-[oklch(0.18_0.03_265)] text-slate-200",
          "border-r border-white/5 shadow-[8px_0_32px_-12px_rgba(0,0,0,0.45)]",
          "backdrop-blur-xl",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-0 -right-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <div className="relative h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 ring-1 ring-white/20">
            <Sparkles className="h-4 w-4 text-white drop-shadow" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/30 to-transparent opacity-60" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-white text-[15px]">Fashion API</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Compliance</span>
          </div>
        </div>

        <nav className="relative flex-1 p-3 space-y-1">
          <div className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </div>
          {nav.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  "transition-all duration-200 ease-out",
                  active
                    ? "bg-gradient-to-r from-white/10 to-white/[0.03] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-0.5",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
                )}
                <Icon className={cn("h-4 w-4 transition-transform duration-200", active ? "text-white" : "text-slate-500 group-hover:text-slate-200 group-hover:scale-110")} />
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative p-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-500 ring-1 ring-white/20" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-semibold text-white truncate">Pro workspace</span>
                <span className="text-[10px] text-slate-400">v1.0 · stable</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-white/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60 flex items-center px-4 md:px-8 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)]" >
          <button className="md:hidden mr-3 p-2 rounded-md hover:bg-accent" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm text-muted-foreground">
            {nav.find((n) => n.to === path)?.label ?? "Dashboard"}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 ring-2 ring-white/30 shadow-md" />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
