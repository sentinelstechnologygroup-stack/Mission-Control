import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { getRouteLabel, navItems } from "./shell-config";

export default function TopNav() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const routeLabel = getRouteLabel(location.pathname);
  const menuItems = useMemo(() => navItems.filter((item) => !item.hidden), []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 h-[52px] border-b bg-[#090b0e] lg:left-[76px]"
      style={{ borderColor: "rgba(32,200,120,0.10)" }}
    >
      <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="rounded-lg border border-white/[0.08] p-2 text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/80 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-white/80">{routeLabel}</div>
            <div className="hidden text-[9px] font-mono uppercase tracking-[0.16em] text-white/25 sm:block">Mission Control</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/25 sm:flex">
          <span>Live shell</span>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/70 lg:hidden" onClick={() => setMobileNavOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-[84vw] max-w-[320px] border-r bg-[#090b0e] p-4"
            style={{ borderColor: "rgba(32,200,120,0.10)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400/70">Mission Control</div>
                <div className="mt-1 text-sm font-semibold text-white/80">Primary navigation</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg border border-white/[0.08] p-2 text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-4 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={`block rounded-2xl border px-3 py-3 text-sm transition-all ${active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white/80"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
