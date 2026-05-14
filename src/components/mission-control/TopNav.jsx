import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Bell, DollarSign, Menu, Search, Signal, TerminalSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import GlobalSearch from "./GlobalSearch";
import { getRouteLabel, navItems } from "./shell-config";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function TopNav() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const routeLabel = getRouteLabel(location.pathname);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[360px] border-white/[0.08] bg-[#090b0e]/98 p-0 text-white sm:max-w-sm">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400/70">Mission Control</div>
                <div className="mt-1 text-sm font-semibold text-white/80">Primary navigation</div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-lg border border-white/[0.08] p-2 text-white/55 hover:bg-white/[0.05] hover:text-white/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all ${active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/[0.06] bg-white/[0.02] text-white/55 hover:bg-white/[0.05] hover:text-white/80"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-mono ${item.accent ? "bg-blue-500/20 text-blue-200" : "bg-amber-500/20 text-amber-300"}`}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
      <header
        className="fixed left-0 right-0 top-0 z-50 h-[52px] border-b bg-[#090b0e] lg:left-[76px] xl:right-[320px]"
        style={{ borderColor: "rgba(32,200,120,0.10)" }}
      >
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="rounded-lg border border-white/[0.08] p-2 text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/80 lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="terminal-label text-emerald-400/80">Operator Surface</span>
              <span className="text-white/10">/</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white/80">{routeLabel}</div>
              <div className="hidden text-[9px] font-mono uppercase tracking-[0.16em] text-white/25 sm:block">
                Command Center · Live Shell
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[9px] font-mono text-white/30 transition-all hover:bg-white/[0.04] hover:text-white/60"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Search</span>
              <span className="hidden rounded border border-white/[0.08] px-1 py-0.5 text-[7px] lg:inline">⌘K</span>
            </button>

            <div className="hidden items-center gap-3 border-l pl-3 xl:flex" style={{ borderColor: "rgba(32,200,120,0.10)" }}>
              <div className="flex items-center gap-1.5">
                <Signal className="h-3 w-3 text-emerald-400/80" />
                <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-emerald-400">Shell Stable</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-white/30">
                <DollarSign className="h-3 w-3" />
                <span>3786</span>
              </div>
            </div>

            <button className="relative hidden rounded-lg p-1.5 text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/50 sm:block">
              <TerminalSquare className="h-3.5 w-3.5" />
            </button>
            <button className="relative hidden rounded-lg p-1.5 text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/50 sm:block">
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
            <button className="relative rounded-lg p-1.5 text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/50">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
