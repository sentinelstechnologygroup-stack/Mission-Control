import { useState } from "react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { StageBadge } from "./LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ArrowRight, X, FileText, CheckCircle, AlertTriangle, User, Clock } from "lucide-react";

const missions = [
  { name: "Demo.ai Platform", owner: "Perry", phase: "APPROVAL", status: "active", tasks: 12, risk: "low", artifacts: ["Frontend v3", "Auth Flow", "Deploy Package"], approval: "Awaiting Patrick", progress: 95 },
  { name: "GTM Strategy Q2", owner: "Sam", phase: "NETTIE_QA", status: "active", tasks: 6, risk: "medium", artifacts: ["GTM Playbook v2", "Competitor Analysis"], approval: "Nettie QA", progress: 72 },
  { name: "Security Audit v2", owner: "Within Core", phase: "EXEC_QA", status: "review", tasks: 4, risk: "low", artifacts: ["Audit Report", "Compliance Matrix"], approval: "Exec QA", progress: 90 },
  { name: "Client Onboarding", owner: "Ivy", phase: "SCOPED", status: "pending", tasks: 3, risk: "high", artifacts: ["Requirements Doc"], approval: "Not Started", progress: 15 },
];

const riskColors = { low: "active", medium: "warning", high: "critical" };

function MissionDetailDrawer({ mission, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 320 }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 glass-card border-l border-white/[0.06] overflow-y-auto"
      style={{ top: "44px" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <StageBadge stage={mission.phase} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-[15px] font-semibold text-white/80 mb-4">{mission.name}</h2>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-white/25 uppercase tracking-wider">Progress</span>
            <span className="text-[10px] font-bold text-white/50 font-mono">{mission.progress}%</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${mission.progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[["Owner", mission.owner], ["Tasks", `${mission.tasks} tasks`], ["Approval", mission.approval], ["Risk", mission.risk]].map(([k, v], i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02]">
              <p className="text-[8px] text-white/20 uppercase mb-1">{k}</p>
              <p className="text-[11px] text-white/55 font-medium">{v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Artifacts</p>
          {mission.artifacts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer mb-1">
              <FileText className="w-3 h-3 text-white/20" />
              <span className="text-[11px] text-white/40">{a}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors">
            View Full Mission
          </button>
          <button className="flex-1 py-2 rounded-xl bg-white/[0.05] text-white/30 text-[10px] font-medium hover:bg-white/[0.09] transition-colors">
            Escalate
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MissionHealthCards() {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <GlassCard delay={0.2}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Active Missions</h3>
          <Target className="w-3.5 h-3.5 text-white/20" />
        </div>
        <div className="space-y-2">
          {missions.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelected(m)}
              className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.07] transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/65 font-semibold truncate mb-1">{m.name}</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] text-white/25">{m.owner}</span>
                  <span className="text-[8px] text-white/10">·</span>
                  <span className="text-[9px] text-white/20">{m.tasks} tasks</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/40 rounded-full" style={{ width: `${m.progress}%` }} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StageBadge stage={m.phase} />
                <StatusBadge variant={riskColors[m.risk]} dot={true}>{m.risk}</StatusBadge>
              </div>
              <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence>
        {selected && <MissionDetailDrawer mission={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}