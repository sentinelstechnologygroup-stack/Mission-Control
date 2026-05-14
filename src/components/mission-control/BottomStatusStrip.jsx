import { useState } from "react";
import { Activity, Bot, ChevronUp, HardDriveDownload, Shield, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const statusItems = [
  { icon: Activity, label: "Shell", value: "Stable", accent: "text-emerald-400" },
  { icon: Bot, label: "Agents", value: "Preserved", accent: "text-blue-300" },
  { icon: HardDriveDownload, label: "Runtime", value: "Adapter Ready", accent: "text-amber-300" },
  { icon: Shield, label: "Phase", value: "UI-1", accent: "text-white/70" },
];

export default function BottomStatusStrip() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="fixed bottom-3 right-3 z-50 inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-white/[0.10] bg-[#090b0e]/98 px-3 py-2 text-left shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="truncate text-[10px] font-mono uppercase tracking-[0.14em] text-white/70">
            Runtime adapter ready
          </span>
          <ChevronUp className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60] bg-black/95 px-3 pb-3 pt-20 md:hidden">
            <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090b0e]/98 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">Runtime status</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">Mini-stack preserved</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-white/[0.08] p-2 text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {statusItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                    >
                      <div className="rounded-xl bg-white/[0.04] p-2">
                        <Icon className={`h-4 w-4 ${item.accent}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/30">{item.label}</p>
                        <p className={`truncate text-sm font-semibold ${item.accent}`}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-[34px] border-t bg-[#090b0e]/98 backdrop-blur-sm lg:left-[76px] xl:right-[320px]"
      style={{ borderColor: "rgba(32,200,120,0.10)" }}
    >
      <div className="flex h-full items-center gap-3 overflow-x-auto px-3 sm:px-4">
        {statusItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex shrink-0 items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-white/25">
              <Icon className={`h-3 w-3 ${item.accent}`} />
              <span>{item.label}</span>
              <span className={`font-semibold ${item.accent}`}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
