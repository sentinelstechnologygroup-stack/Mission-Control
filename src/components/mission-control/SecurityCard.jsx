import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { Shield, AlertTriangle, Lock } from "lucide-react";

export default function SecurityCard() {
  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">System Security</h3>
        <Shield className="w-3.5 h-3.5 text-white/20" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] text-white/60 font-medium">Perry</p>
            <p className="text-[9px] text-white/25">Infra Health → 94%</p>
          </div>
          <StatusBadge variant="active">Secure</StatusBadge>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] text-white/60 font-medium">Description Drift</p>
            <p className="text-[9px] text-white/25">Last Anomaly: 17m ago</p>
          </div>
          <StatusBadge variant="warning">1 Alert</StatusBadge>
        </div>
      </div>
    </GlassCard>
  );
}