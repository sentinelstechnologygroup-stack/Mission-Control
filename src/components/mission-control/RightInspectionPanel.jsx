import { useLocation } from "react-router-dom";
import { ActivitySquare, Eye, Layers3, ScanSearch } from "lucide-react";
import { getRouteLabel } from "./shell-config";

const inspectionItems = [
  { label: "Surface", value: "Preserved" },
  { label: "Adapter Mode", value: "Available" },
  { label: "Runtime Lock-In", value: "Removed" },
  { label: "Phase", value: "UI-1" },
];

export default function RightInspectionPanel() {
  const location = useLocation();
  const routeLabel = getRouteLabel(location.pathname);

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 hidden w-[320px] border-l bg-[#090b0e] xl:block"
      style={{ borderColor: "rgba(32,200,120,0.10)" }}
      aria-label="Inspection panel"
    >
      <div className="h-[52px] border-b px-4 py-3" style={{ borderColor: "rgba(32,200,120,0.10)" }}>
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-emerald-400/80" />
          <span className="terminal-label">Inspection Panel</span>
        </div>
      </div>

      <div className="space-y-4 p-4 pt-[18px]">
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <ScanSearch className="h-3.5 w-3.5 text-blue-300/80" />
            <span className="terminal-label">Current Workspace</span>
          </div>
          <div className="text-sm font-semibold text-white/75">{routeLabel}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-white/35">
            Persistent placeholder rail reserved for future live inspection, context drilling, and selected-item details.
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers3 className="h-3.5 w-3.5 text-emerald-400/80" />
            <span className="terminal-label">Shell State</span>
          </div>
          <div className="space-y-2">
            {inspectionItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">{item.label}</span>
                <span className="text-[10px] font-mono text-white/55">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <ActivitySquare className="h-3.5 w-3.5 text-amber-300/80" />
            <span className="terminal-label">Notes</span>
          </div>
          <ul className="space-y-2 text-[11px] leading-relaxed text-white/35">
            <li>• Shared shell now owns all route framing.</li>
            <li>• Page-level drawers/modals remain untouched and continue overlaying above the workspace.</li>
            <li>• Reserved area can be bound to live inspection in Phase UI-2.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
