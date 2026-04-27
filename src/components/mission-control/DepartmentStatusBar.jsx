import { useState } from "react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { StageBadge } from "./LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Brain, TrendingUp, Code, Wrench, X, FileText, AlertTriangle, ChevronRight, Cpu, Target, Zap } from "lucide-react";

const departments = [
  {
    name: "Perry", dept: "Development", icon: Code, status: "active", active: 43, load: 89, alerts: 0,
    purpose: "Full-stack development, deployment, and code quality.",
    autonomy: "High — can merge PRs, deploy to staging. Production requires Patrick approval.",
    specialists: ["Git Assistant", "CI/CD Runner", "Code Reviewer", "Doc Writer"],
    activeMissions: ["Demo.ai Platform", "MeeshgCat Launch"],
    blockedItems: ["Auth performance regression"],
    recentOutputs: ["Frontend v3", "Auth flow", "API rate limiter"],
    stageDistribution: { IN_PROGRESS: 15, EXEC_QA: 4, PERRY_QA: 3 },
  },
  {
    name: "Within Core", dept: "Security", icon: Shield, status: "active", active: 8, load: 62, alerts: 1,
    purpose: "Infrastructure security, compliance, and threat monitoring.",
    autonomy: "Medium — can flag issues. Remediation requires approval.",
    specialists: ["Vuln Scanner", "Access Auditor", "Compliance Checker"],
    activeMissions: ["Security Audit v2"],
    blockedItems: ["Description drift — awaiting root cause"],
    recentOutputs: ["Audit Report v2", "Rate limit config"],
    stageDistribution: { IN_PROGRESS: 3, EXEC_QA: 2 },
  },
  {
    name: "Ivy", dept: "Intelligence", icon: Brain, status: "warning", active: 8, load: 74, alerts: 2,
    purpose: "Market intelligence, research, and competitive analysis.",
    autonomy: "Medium — can scrape and index. Published reports require review.",
    specialists: ["Market Scanner", "Data Indexer", "Report Builder"],
    activeMissions: ["Market Intelligence System", "Client Onboarding"],
    blockedItems: ["Index backlog growing", "2 stale data sources"],
    recentOutputs: ["Market trends batch 6", "Competitor analysis"],
    stageDistribution: { INTAKE: 3, IN_PROGRESS: 4, EXEC_QA: 1 },
  },
  {
    name: "Sam", dept: "Growth", icon: TrendingUp, status: "active", active: 4, load: 45, alerts: 0,
    purpose: "Growth strategy, marketing, and go-to-market execution.",
    autonomy: "Low — all outputs require Nettie review before publication.",
    specialists: ["Content Writer", "SEO Analyst", "Campaign Manager"],
    activeMissions: ["Q2 GTM Strategy"],
    blockedItems: [],
    recentOutputs: ["GTM Playbook v2", "Pricing analysis"],
    stageDistribution: { SCOPED: 1, IN_PROGRESS: 2, NETTIE_QA: 1 },
  },
  {
    name: "Nexus", dept: "Systems", icon: Wrench, status: "active", active: 12, load: 55, alerts: 0,
    purpose: "Internal systems, tooling, CI/CD, and infrastructure automation.",
    autonomy: "High — can auto-scale, configure pipelines. Schema changes require approval.",
    specialists: ["Pipeline Worker", "Integration Bot", "Schema Manager", "Log Analyzer"],
    activeMissions: [],
    blockedItems: [],
    recentOutputs: ["Pipeline optimization", "Schema migration v4"],
    stageDistribution: { IN_PROGRESS: 6, EXEC_QA: 2 },
  },
];

function DeptDrawer({ dept, onClose }) {
  const Icon = dept.icon;
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Icon className="w-5 h-5 text-white/40" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white/80">{dept.name}</h2>
              <p className="text-[9px] text-white/25">{dept.dept} · {dept.specialists.length} specialists</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Load bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-white/25 uppercase tracking-wider">Capacity Load</span>
            <span className={`text-[11px] font-bold font-mono ${dept.load > 80 ? "text-red-400" : dept.load > 70 ? "text-amber-400" : "text-emerald-400"}`}>{dept.load}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${dept.load > 80 ? "bg-red-500/60" : dept.load > 70 ? "bg-amber-500/60" : "bg-emerald-500/50"}`} style={{ width: `${dept.load}%` }} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Department Mandate</p>
            <p className="text-[11px] text-white/45 leading-relaxed">{dept.purpose}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Autonomy Policy</p>
            <p className="text-[11px] text-white/45 leading-relaxed">{dept.autonomy}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Specialists ({dept.specialists.length})</p>
            {dept.specialists.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
                <Cpu className="w-3 h-3 text-white/15" />
                <span className="text-[11px] text-white/40">{s}</span>
              </div>
            ))}
          </div>
          {dept.activeMissions.length > 0 && (
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Active Missions</p>
              {dept.activeMissions.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] mb-1">
                  <Target className="w-3 h-3 text-white/20" />
                  <span className="text-[11px] text-white/40">{m}</span>
                </div>
              ))}
            </div>
          )}
          {dept.blockedItems.length > 0 && (
            <div>
              <p className="text-[9px] text-red-400/60 uppercase tracking-wider mb-2">Blocked Items</p>
              {dept.blockedItems.map((b, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10 mb-1">
                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-[11px] text-red-400/70">{b}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Stage Distribution</p>
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(dept.stageDistribution).map(([stage, count], i) => (
                <div key={i} className="flex items-center gap-1">
                  <StageBadge stage={stage} />
                  <span className="text-[8px] text-white/20 font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Recent Outputs</p>
            {dept.recentOutputs.map((o, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <FileText className="w-3 h-3 text-white/15" />
                <span className="text-[11px] text-white/35">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DepartmentStatusBar() {
  const [selectedDept, setSelectedDept] = useState(null);

  return (
    <>
      <GlassCard delay={0.1}>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Department Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {departments.map((dept, i) => {
            const Icon = dept.icon;
            const isOverloaded = dept.load > 80;
            return (
              <button
                key={i}
                onClick={() => setSelectedDept(dept)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/35" />
                  </div>
                  {dept.alerts > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 text-[7px] font-bold text-black flex items-center justify-center">{dept.alerts}</span>}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-white/65">{dept.name}</p>
                  <p className="text-[8px] text-white/20">{dept.dept}</p>
                </div>
                <div className="w-full">
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isOverloaded ? "bg-red-500/50" : "bg-emerald-500/40"}`} style={{ width: `${dept.load}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold font-mono ${isOverloaded ? "text-amber-400" : "text-emerald-400"}`}>{dept.active}</span>
                  <span className="text-[8px] text-white/20">jobs</span>
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <AnimatePresence>
        {selectedDept && <DeptDrawer dept={selectedDept} onClose={() => setSelectedDept(null)} />}
      </AnimatePresence>
    </>
  );
}