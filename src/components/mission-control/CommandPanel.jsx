import { useState } from "react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { Send, AlertTriangle, ChevronDown } from "lucide-react";

const escalations = [
  { title: "Client Build Delays", owner: "Perry / Escalation", risk: "critical" },
  { title: "Database Rate Limits", owner: "Within Core / Infra", risk: "warning" },
  { title: "Performance Issue", owner: "Within Core / Security QA", risk: "warning" },
];

export default function CommandPanel() {
  const [command, setCommand] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard delay={0.05}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Patrick Command</h3>
        <Send className="w-3.5 h-3.5 text-white/20" />
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter a high-level command..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-[11px] font-medium text-white/40">Escalations</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">{escalations.length}</span>
      </div>

      <div className="space-y-2">
        {escalations.slice(0, expanded ? undefined : 2).map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/60 font-medium truncate">{item.title}</p>
              <p className="text-[9px] text-white/25">{item.owner}</p>
            </div>
            <StatusBadge variant={item.risk} dot={false}>
              {item.risk === "critical" ? "HIGH RISK" : "ALERT"}
            </StatusBadge>
          </div>
        ))}
      </div>

      {escalations.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-[10px] text-white/30 hover:text-white/50 transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `${escalations.length - 2} more escalations`}
        </button>
      )}
    </GlassCard>
  );
}