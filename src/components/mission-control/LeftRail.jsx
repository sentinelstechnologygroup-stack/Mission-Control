import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navItems } from "./shell-config";

export default function LeftRail() {
  const location = useLocation();
  const visibleItems = navItems.filter((item) => !item.hidden)
  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path))

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[76px] border-r bg-[#090b0e] lg:flex lg:flex-col"
      style={{ borderColor: "rgba(32,200,120,0.10)" }}
      aria-label="Primary navigation"
    >
      <div className="flex h-[52px] items-center justify-center border-b" style={{ borderColor: "rgba(32,200,120,0.10)" }}>
        <Link to="/" className="flex items-center justify-center" aria-label="Home">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-emerald-500/10" style={{ borderColor: "rgba(32,200,120,0.30)" }}>
            <div className="h-2 w-2 rounded-full bg-emerald-400 neon-dot" />
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2 px-2 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-150",
                active ? "text-emerald-400 bg-emerald-500/10" : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
              )}
              style={{ borderColor: active ? "rgba(32,200,120,0.24)" : "rgba(255,255,255,0.05)" }}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-2 py-3" style={{ borderColor: "rgba(32,200,120,0.10)" }}>
        <div className="glass-card rounded-xl px-2 py-2 text-center">
          <div className="terminal-label">Shell</div>
          <div className="mt-1 text-[10px] font-mono text-emerald-400">LIVE</div>
        </div>
      </div>
    </aside>
  );
}
