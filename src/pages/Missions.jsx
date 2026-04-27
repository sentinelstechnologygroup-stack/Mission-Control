import { useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { LifecyclePipeline, StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import { Target, X, ChevronRight, FileText, AlertTriangle, LayoutGrid, List, CheckCircle, RotateCcw, User, Layers } from "lucide-react";

const missions = [
  {
    id: 1, name: "Demo.ai Platform Build", owner: "Perry", type: "Client Build",
    status: "active", stage: "APPROVAL", tasks: 12, risk: "low", approval: "Awaiting Patrick",
    artifacts: ["Wireframes v2", "Frontend v3", "Auth Flow", "API Spec", "Deploy Package"],
    desc: "Full-stack SaaS platform build for Demo.ai client. Includes frontend, backend, auth, and deployment.",
    linkedTasks: ["Implement auth flow", "Deploy to staging", "Final QA review"],
    risks: [],
    outputs: ["Staging environment live", "Auth system passing", "Performance at 98/100"],
  },
  {
    id: 2, name: "Q2 GTM Strategy", owner: "Sam", type: "Strategic Initiative",
    status: "active", stage: "NETTIE_QA", tasks: 6, risk: "medium", approval: "Nettie QA",
    artifacts: ["GTM Playbook v2", "Competitor Analysis", "Pricing Model"],
    desc: "Go-to-market strategy for Q2 including positioning, pricing, and channel strategy.",
    linkedTasks: ["Competitor pricing analysis", "Channel strategy draft", "Messaging framework"],
    risks: ["Timeline tight for Q2 launch"],
    outputs: ["Competitor landscape mapped", "3 positioning angles identified"],
  },
  {
    id: 3, name: "Security Audit v2", owner: "Within Core", type: "Internal",
    status: "review", stage: "EXEC_QA", tasks: 4, risk: "low", approval: "Exec QA",
    artifacts: ["Audit Report", "Compliance Matrix", "Remediation Plan"],
    desc: "Comprehensive security audit of all infrastructure and deployed services.",
    linkedTasks: ["Review API surface", "Check access logs", "Compliance verification"],
    risks: [],
    outputs: ["94% infra health", "1 advisory flag"],
  },
  {
    id: 4, name: "Client Onboarding Flow", owner: "Ivy", type: "Client Build",
    status: "pending", stage: "SCOPED", tasks: 3, risk: "high", approval: "Not Started",
    artifacts: ["Requirements Doc", "Flow Diagram"],
    desc: "Automated onboarding flow for new enterprise clients with custom integrations.",
    linkedTasks: ["Requirements gathering", "Flow design", "Integration planning"],
    risks: ["Client requirements still evolving", "Dependency on 3rd party API"],
    outputs: [],
  },
  {
    id: 5, name: "MeeshgCat Product Launch", owner: "Perry", type: "Product Build",
    status: "active", stage: "PERRY_QA", tasks: 8, risk: "low", approval: "Perry QA",
    artifacts: ["Product Spec", "Landing Page", "Launch Checklist", "Marketing Kit"],
    desc: "Consumer product launch with marketing site and distribution pipeline.",
    linkedTasks: ["Final QA checklist", "Launch copy review", "Distribution setup"],
    risks: [],
    outputs: ["Landing page live (staging)", "Product spec v2 approved"],
  },
  {
    id: 6, name: "Market Intelligence System", owner: "Ivy", type: "Internal",
    status: "active", stage: "IN_PROGRESS", tasks: 5, risk: "medium", approval: "In Progress",
    artifacts: ["System Design", "Data Pipeline v1"],
    desc: "Automated market intelligence gathering and reporting system.",
    linkedTasks: ["Data pipeline setup", "Index 6 new sources", "Report template design"],
    risks: ["Index backlog growing"],
    outputs: ["Pipeline v1 operational", "6 sources indexed"],
  },
];

const riskColors = { low: "active", medium: "warning", high: "critical" };
const typeColors = { "Client Build": "info", "Strategic Initiative": "review", "Internal": "idle", "Product Build": "active" };

function MissionDrawer({ mission, onClose }) {
  const [tab, setTab] = useState("overview");
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 glass-card border-l border-white/[0.06] overflow-y-auto"
      style={{ top: "48px" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <StatusBadge variant={typeColors[mission.type]} dot={false}>{mission.type}</StatusBadge>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-[16px] font-semibold text-white/80 mb-1">{mission.name}</h2>
        <p className="text-[11px] text-white/35 leading-relaxed mb-4">{mission.desc}</p>

        {/* Lifecycle */}
        <div className="mb-4 p-3 rounded-xl bg-white/[0.02] overflow-x-auto">
          <p className="text-[8px] text-white/25 uppercase tracking-wider mb-2">Lifecycle Stage</p>
          <LifecyclePipeline currentStage={mission.stage} />
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-white/[0.02]">
            <p className="text-[8px] text-white/20 uppercase mb-1">Owner Exec</p>
            <p className="text-[12px] text-white/60 font-medium">{mission.owner}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02]">
            <p className="text-[8px] text-white/20 uppercase mb-1">Approval State</p>
            <p className="text-[12px] text-white/60 font-medium">{mission.approval}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02]">
            <p className="text-[8px] text-white/20 uppercase mb-1">Risk Level</p>
            <StatusBadge variant={riskColors[mission.risk]}>{mission.risk}</StatusBadge>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02]">
            <p className="text-[8px] text-white/20 uppercase mb-1">Tasks</p>
            <p className="text-[12px] text-white/60 font-medium">{mission.tasks} tasks</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 mb-3">
          {["overview", "tasks", "risks"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors capitalize ${tab === t ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-3">
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Artifacts</p>
              {mission.artifacts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer mb-1">
                  <FileText className="w-3 h-3 text-white/20" />
                  <span className="text-[11px] text-white/45">{a}</span>
                </div>
              ))}
            </div>
            {mission.outputs.length > 0 && (
              <div>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Outputs</p>
                {mission.outputs.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400/50" />
                    <span className="text-[11px] text-white/40">{o}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "tasks" && (
          <div className="space-y-1.5">
            {mission.linkedTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-[9px] font-mono text-white/20">{i + 1}.</span>
                <span className="text-[11px] text-white/45">{t}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "risks" && (
          <div className="space-y-2">
            {mission.risks.length > 0 ? mission.risks.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400/70">{r}</span>
              </div>
            )) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400/60">No active risks</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Missions() {
  const [view, setView] = useState("board");
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Missions</h1>
          <p className="text-[11px] text-white/30">Long-horizon projects — lifecycle tracked, owner-led, approval-gated</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button onClick={() => setView("board")} className={`p-1.5 rounded-md transition-colors ${view === "board" ? "bg-white/[0.08] text-white/70" : "text-white/25"}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white/[0.08] text-white/70" : "text-white/25"}`}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "board" ? (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {missions.map((m, i) => (
                <GlassCard key={m.id} hover delay={i * 0.04} onClick={() => setSelected(m)}>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge variant={typeColors[m.type]} dot={false}>{m.type}</StatusBadge>
                    <StatusBadge variant={riskColors[m.risk]}>{m.risk} risk</StatusBadge>
                  </div>
                  <h3 className="text-[13px] font-semibold text-white/70 mb-1">{m.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-3 h-3 text-white/15" />
                    <span className="text-[9px] text-white/30">{m.owner}</span>
                    <span className="text-[9px] text-white/10">·</span>
                    <span className="text-[9px] text-white/25">{m.tasks} tasks</span>
                    <span className="text-[9px] text-white/10">·</span>
                    <span className="text-[9px] text-white/25">{m.artifacts.length} artifacts</span>
                  </div>
                  {/* Lifecycle stage */}
                  <div className="pt-2 border-t border-white/[0.04]">
                    <StageBadge stage={m.stage} />
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {missions.map((m, i) => (
                <GlassCard key={m.id} hover delay={i * 0.03} onClick={() => setSelected(m)} className="p-3">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[12px] text-white/70 font-medium">{m.name}</p>
                        <StageBadge stage={m.stage} />
                        <StatusBadge variant={riskColors[m.risk]} dot={true}>{m.risk}</StatusBadge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/25">{m.owner}</span>
                        <span className="text-[9px] text-white/10">·</span>
                        <span className="text-[9px] text-white/25">{m.tasks} tasks</span>
                        <span className="text-[9px] text-white/10">·</span>
                        <span className="text-[9px] text-white/25">{m.approval}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/10 shrink-0" />
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && <MissionDrawer mission={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}