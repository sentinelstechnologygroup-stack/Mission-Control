import { useState } from "react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { StageBadge } from "./LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight, AlertTriangle, Clock, Target, FileText, Zap, TrendingUp } from "lucide-react";

const systemPriorities = [
  { rank: 1, label: "Demo.ai Website Launch", type: "Approval Gate", urgency: "critical", stage: "APPROVAL" },
  { rank: 2, label: "Q2 Budget Allocation", type: "Patrick Decision", urgency: "critical", stage: "APPROVAL" },
  { rank: 3, label: "Security Rate Limit Fix", type: "Escalation", urgency: "warning", stage: "EXEC_QA" },
  { rank: 4, label: "GTM Playbook v2", type: "QA Review", urgency: "info", stage: "NETTIE_QA" },
];

const routingQueue = [
  { from: "Patrick", cmd: "Build landing page for MeeshgCat", to: "Perry", dept: "Development", status: "routing" },
  { from: "Ivy", cmd: "New competitor pricing data available", to: "Sam", dept: "Growth", status: "escalated" },
  { from: "Within Core", cmd: "Rate limit anomaly detected", to: "Nexus", dept: "Systems", status: "routed" },
];

const pendingEscalations = [
  { title: "Client Build Delays", owner: "Perry", dept: "Development", since: "47m", risk: "critical" },
  { title: "Description Drift in API Schema", owner: "Within Core", dept: "Security", since: "1h", risk: "warning" },
  { title: "Market Index Backlog", owner: "Ivy", dept: "Intelligence", since: "2h", risk: "warning" },
];

const decisionSummary = [
  { label: "Approved Today", value: 12, trend: "+3" },
  { label: "Rejected", value: 2, trend: "0" },
  { label: "Returned for Rework", value: 4, trend: "+1" },
  { label: "Awaiting Patrick", value: 2, trend: "+2" },
];

export default function NettieOrchestrationPanel() {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState("priorities");

  return (
    <GlassCard className="border border-blue-500/10 col-span-full" delay={0.08}>
      {/* Header */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-blue-400" style={{ width: "18px", height: "18px" }} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-background animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-white/80">Nettie</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono uppercase">Orchestrator</span>
            </div>
            <p className="text-[9px] text-white/25 font-mono">Chief AI Orchestrator · Central Command Layer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3">
            {decisionSummary.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-[13px] font-bold text-white/60 font-mono">{d.value}</p>
                <p className="text-[8px] text-white/20 uppercase tracking-wider leading-none mt-0.5">{d.label.split(" ")[0]}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} />
          </button>
        </div>
      </div>

      {/* Nettie status line */}
      <div className="flex items-center gap-1.5 mt-2 mb-3 px-0.5">
        <span className="w-1 h-1 rounded-full bg-emerald-500" />
        <p className="text-[10px] text-white/30 leading-none">
          Pipeline healthy · 3 escalations need resolution · 2 items awaiting Patrick approval · Daily cost 4% under budget
        </p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Section tabs */}
            <div className="flex items-center gap-1 mb-3 border-b border-white/[0.05] pb-2">
              {[
                { id: "priorities", label: "System Priorities", icon: Target },
                { id: "routing", label: "Active Routing", icon: Zap },
                { id: "escalations", label: "Escalations", count: pendingEscalations.length, icon: AlertTriangle },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      activeSection === tab.id
                        ? "bg-white/[0.07] text-white/70"
                        : "text-white/25 hover:text-white/50"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[8px]">{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {activeSection === "priorities" && (
                <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {systemPriorities.map((item, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors group">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[8px] font-mono text-white/20">#{item.rank}</span>
                          <StatusBadge variant={item.urgency} dot={false} className="ml-auto">{item.type}</StatusBadge>
                        </div>
                        <p className="text-[11px] text-white/60 font-medium leading-tight mb-2">{item.label}</p>
                        <StageBadge stage={item.stage} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === "routing" && (
                <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="space-y-2">
                    {routingQueue.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-white/40">{item.from}</span>
                          <ChevronRight className="w-3 h-3 text-white/15" />
                          <span className="text-[10px] font-semibold text-blue-400">Nettie</span>
                          <ChevronRight className="w-3 h-3 text-white/15" />
                          <span className="text-[10px] font-semibold text-white/50">{item.to}</span>
                        </div>
                        <p className="text-[10px] text-white/30 flex-1 min-w-0 truncate">{item.cmd}</p>
                        <StatusBadge variant={item.status === "routing" ? "warning" : item.status === "escalated" ? "critical" : "active"} dot={true}>
                          {item.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === "escalations" && (
                <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="space-y-2">
                    {pendingEscalations.map((esc, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/[0.05] cursor-pointer transition-colors">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${esc.risk === "critical" ? "text-red-400" : "text-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/60 font-medium">{esc.title}</p>
                          <p className="text-[9px] text-white/20">{esc.owner} · {esc.dept}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono text-white/20">{esc.since}</span>
                          <StatusBadge variant={esc.risk} dot={false}>{esc.risk}</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}