import GlassCard from "./GlassCard";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

const metrics = [
  { label: "Monthly Burn", value: "$3,786", trend: null },
  { label: "Daily Rate", value: "$128", trend: "down" },
  { label: "Current Revenue", value: "$15,835", trend: "up" },
  { label: "Net for April", value: "+$1,249", trend: "up" },
];

export default function CostPanel() {
  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Cost Tracker</h3>
        <DollarSign className="w-3.5 h-3.5 text-white/20" />
      </div>
      <div className="space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[11px] text-white/35">{m.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-white/80 font-mono">{m.value}</span>
              {m.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
              {m.trend === "down" && <TrendingDown className="w-3 h-3 text-blue-400" />}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}