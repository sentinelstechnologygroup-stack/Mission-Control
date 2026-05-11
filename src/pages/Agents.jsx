import { useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Brain, TrendingUp, Code, Wrench, Cpu, X, FileText, AlertTriangle,
  ChevronDown, ChevronRight, Crown, DollarSign, Microscope, ClipboardList,
  Lightbulb, Radio, Target, Zap, Lock, User, BarChart2
} from "lucide-react";
import { Link } from "react-router-dom";

const tabs = [
  { id: "orgchart", label: "Chain of Command" },
  { id: "hierarchy", label: "Org Hierarchy" },
  { id: "models", label: "Models / Routing" },
];

// Full org structure matching spec
const ORG_CHART = {
  name: "Patrick Camacho",
  role: "Final Authority",
  type: "human",
  children: [
    {
      name: "Nettie",
      role: "Chief of Staff · Command Coordinator",
      type: "orchestrator",
      status: "active",
      children: [
        {
          name: "Van",
          role: "Chief Technology & Operations Officer",
          type: "executive",
          icon: Code,
          load: 89,
          specialists: ["Forge — Build Execution", "Blueprint — Architecture", "Warden — Redesign", "Prism — Visual / Graphics"],
        },
        {
          name: "Perry",
          role: "Chief Security Officer",
          type: "executive",
          icon: Shield,
          load: 62,
          specialists: ["Lock — Permissions", "Vault — Secrets", "Sentry — System Security", "Calamity — Red Team"],
        },
        {
          name: "Torina",
          role: "Chief Media Officer",
          type: "executive",
          icon: Radio,
          load: 55,
          specialists: ["Quill — Copywriting", "Frame — Visual Media", "Signal — Distribution", "Polish — Brand Review"],
        },
        {
          name: "Dana",
          role: "Chief Financial Officer",
          type: "executive",
          icon: DollarSign,
          load: 40,
          specialists: ["Ledger — Financial Tracking", "Anvil — Pricing & Margin", "Reserve — Capital Planning", "Portfolio — Investment"],
        },
        {
          name: "Icky",
          role: "Chief Administrative Officer",
          type: "executive",
          icon: ClipboardList,
          load: 48,
          specialists: ["Clerk — Records", "Anchor — Accountability", "Orderly — Admin Hygiene", "Table — Coordination"],
        },
        {
          name: "Funboy",
          role: "Chief Opportunity Intelligence Officer",
          type: "executive",
          icon: Lightbulb,
          load: 70,
          specialists: ["Drift — Signal Scanning", "Signal — Pattern Detection", "Heatmap — Trend Analysis", "Scout — Opportunity Brief"],
        },
        {
          name: "Rab",
          role: "Chief R&D Officer",
          type: "executive",
          icon: Microscope,
          load: 35,
          specialists: ["Lab — Experimentation", "Model — Concept Structuring", "Pilot — Proof-of-Concept", "Vector — Innovation Strategy"],
        },
      ],
    },
  ],
};

// Full executive detail data
const EXEC_DETAILS = {
  Van: {
    mandate: "Full-stack technology execution, system architecture, deployment pipelines, and visual output quality.",
    autonomy: "High — can merge PRs, deploy to staging. Production and schema changes require Patrick approval.",
    activeMissions: ["Demo.ai Platform", "MeeshgCat Launch"],
    activeTasks: 43, blockedItems: ["Auth performance regression pending root cause"],
    outputs: ["Frontend v3", "Auth flow", "API rate limiter", "Deploy pipeline v4"],
    stageDistribution: { IN_PROGRESS: 15, EXEC_QA: 4, PERRY_QA: 3 },
    qaGate: "PERRY_QA",
  },
  Perry: {
    mandate: "Infrastructure security, access control, compliance, threat detection, and red team exercises.",
    autonomy: "Medium — can flag and investigate threats. Remediation and access changes require executive approval.",
    activeMissions: ["Security Audit v2"],
    activeTasks: 8, blockedItems: ["Description drift — awaiting root cause analysis"],
    outputs: ["Audit Report v2", "Rate limit config", "Access matrix update"],
    stageDistribution: { IN_PROGRESS: 3, EXEC_QA: 2 },
    qaGate: "EXEC_QA",
  },
  Torina: {
    mandate: "Brand communications, content production, media distribution, and brand consistency enforcement.",
    autonomy: "Low — all published content requires Nettie review. Internal drafts can be created freely.",
    activeMissions: ["GTM Strategy Q2", "MeeshgCat Content"],
    activeTasks: 12, blockedItems: [],
    outputs: ["GTM Playbook v2", "MeeshgCat Launch Copy", "AI Workforce Thread"],
    stageDistribution: { SCOPED: 2, IN_PROGRESS: 5, NETTIE_QA: 3, APPROVAL: 1 },
    qaGate: "NETTIE_QA",
  },
  Dana: {
    mandate: "Financial tracking, cost optimization, pricing strategy, capital planning, and investment management.",
    autonomy: "Medium — can generate reports and recommendations. Financial decisions require Patrick approval.",
    activeMissions: ["Q2 Budget Allocation"],
    activeTasks: 5, blockedItems: [],
    outputs: ["Q2 Budget Report", "Model cost optimization analysis", "Revenue projection Q2"],
    stageDistribution: { IN_PROGRESS: 3, NETTIE_QA: 1, APPROVAL: 1 },
    qaGate: "NETTIE_QA",
  },
  Icky: {
    mandate: "Administrative hygiene, records management, team coordination, and accountability tracking.",
    autonomy: "Low — administrative actions require Nettie or executive authorization.",
    activeMissions: [],
    activeTasks: 7, blockedItems: [],
    outputs: ["Onboarding checklist v3", "Meeting records April", "Admin hygiene audit"],
    stageDistribution: { INTAKE: 2, IN_PROGRESS: 4 },
    qaGate: "NETTIE_QA",
  },
  Funboy: {
    mandate: "Opportunity scanning, competitive intelligence, signal detection, and market trend analysis.",
    autonomy: "Medium — can scan and report signals. Strategic responses require Torina or Patrick direction.",
    activeMissions: ["Market Intelligence System"],
    activeTasks: 11, blockedItems: ["2 stale data sources", "Index backlog: 47 items"],
    outputs: ["Market trends batch 6", "Competitor analysis", "Opportunity brief Q2"],
    stageDistribution: { INTAKE: 4, IN_PROGRESS: 5, EXEC_QA: 2 },
    qaGate: "EXEC_QA",
  },
  Rab: {
    mandate: "Research and development, concept validation, prototyping, and innovation strategy.",
    autonomy: "High — can experiment freely. Productionizing any concept requires Van approval.",
    activeMissions: [],
    activeTasks: 4, blockedItems: [],
    outputs: ["AI workflow prototype v2", "Concept brief: autonomous QA"],
    stageDistribution: { SCOPED: 1, IN_PROGRESS: 3 },
    qaGate: "EXEC_QA",
  },
};

const models = [
  { name: "GPT-4o", provider: "OpenAI", usage: "Primary reasoning, complex tasks", depts: ["Van", "Torina", "Funboy"], cost: "$0.45/hr" },
  { name: "Claude 3.5 Sonnet", provider: "Anthropic", usage: "Code generation, structured output", depts: ["Van", "Perry"], cost: "$0.38/hr" },
  { name: "GPT-4o-mini", provider: "OpenAI", usage: "Lightweight classification, routing", depts: ["All"], cost: "$0.08/hr" },
  { name: "Gemini 1.5 Pro", provider: "Google", usage: "Long-context analysis, documents", depts: ["Funboy", "Perry"], cost: "$0.52/hr" },
  { name: "Claude 3 Haiku", provider: "Anthropic", usage: "Fast routing layer, triage", depts: ["Nettie"], cost: "$0.04/hr" },
];

const loadColor = (load) => load > 80 ? "text-red-400" : load > 65 ? "text-amber-400" : "text-emerald-400";
const loadBarColor = (load) => load > 80 ? "bg-red-500/50" : load > 65 ? "bg-amber-500/50" : "bg-emerald-500/40";

// Exec detail drawer
function ExecDrawer({ exec, details, onClose }) {
  const Icon = exec.icon;
  const d = details[exec.name] || {};
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 overflow-y-auto border-l border-white/[0.06]"
      style={{ top: "44px", background: "hsl(225 12% 7%)" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Icon className="w-5 h-5 text-white/40" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white/85">{exec.name}</h2>
              <p className="text-[9px] text-white/30 leading-none mt-0.5">{exec.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Load */}
        <div className="mb-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[9px] text-white/25 uppercase tracking-wider">Capacity Load</span>
            <span className={`text-[11px] font-bold font-mono ${loadColor(exec.load)}`}>{exec.load}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${exec.load}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${loadBarColor(exec.load)}`}
            />
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
            <p className="text-[16px] font-bold text-white/70 font-mono">{d.activeTasks || 0}</p>
            <p className="text-[8px] text-white/20 uppercase">Active Tasks</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
            <p className="text-[16px] font-bold text-white/70 font-mono">{exec.specialists.length}</p>
            <p className="text-[8px] text-white/20 uppercase">Specialists</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
            <p className="text-[11px] font-bold text-purple-400 font-mono pt-1">{d.qaGate?.replace("_QA", " QA") || "—"}</p>
            <p className="text-[8px] text-white/20 uppercase">QA Gate</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Department Mandate</p>
            <p className="text-[11px] text-white/45 leading-relaxed">{d.mandate}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Autonomy Policy</p>
            <p className="text-[11px] text-white/45 leading-relaxed">{d.autonomy}</p>
          </div>

          {/* Stage distribution */}
          {d.stageDistribution && (
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Stage Distribution</p>
              <div className="flex items-center gap-1 flex-wrap">
                {Object.entries(d.stageDistribution).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-1 mb-1">
                    <StageBadge stage={stage} />
                    <span className="text-[8px] text-white/20 font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active missions */}
          {d.activeMissions?.length > 0 && (
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Active Missions</p>
              {d.activeMissions.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] mb-1 hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <Target className="w-3 h-3 text-white/20" />
                  <span className="text-[11px] text-white/40">{m}</span>
                </div>
              ))}
            </div>
          )}

          {/* Blocked items */}
          {d.blockedItems?.length > 0 && (
            <div>
              <p className="text-[9px] text-red-400/60 uppercase tracking-wider mb-2">Blocked Items</p>
              {d.blockedItems.map((b, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10 mb-1">
                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red-400/70">{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Specialists */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Specialists ({exec.specialists.length})</p>
            {exec.specialists.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <Cpu className="w-3 h-3 text-white/15 shrink-0" />
                <span className="text-[11px] text-white/40">{s}</span>
                <StatusBadge variant="active" dot={true} className="ml-auto">active</StatusBadge>
              </div>
            ))}
          </div>

          {/* Recent outputs */}
          {d.outputs?.length > 0 && (
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Recent Outputs</p>
              {d.outputs.map((o, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 hover:bg-white/[0.02] rounded px-1 cursor-pointer transition-colors">
                  <FileText className="w-3 h-3 text-white/15" />
                  <span className="text-[11px] text-white/35">{o}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Link to={`/departments/${exec.name.toLowerCase()}`} className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/20 transition-colors">
              Open office
            </Link>
            <Link to="/reports" className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 text-[10px] font-medium hover:bg-white/[0.07] transition-colors">
              Reports
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact org chart node
function OrgNode({ node, depth = 0, onSelectExec }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children?.length > 0;
  const isHuman = node.type === "human";
  const isOrchestrator = node.type === "orchestrator";
  const isExec = node.type === "executive";
  const Icon = node.icon;

  return (
    <div className={`${depth > 0 ? "ml-6 pl-4 border-l border-white/[0.06]" : ""}`}>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-xl mb-1 transition-all ${
        isExec ? "hover:bg-white/[0.04] cursor-pointer" : ""
      } ${isHuman ? "border border-amber-500/15 bg-amber-500/5" : isOrchestrator ? "border border-blue-500/15 bg-blue-500/5" : "border border-white/[0.04] bg-white/[0.02]"}`}
        onClick={() => isExec && onSelectExec(node)}
      >
        {isHuman && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
        {isOrchestrator && <Brain className="w-4 h-4 text-blue-400 shrink-0" />}
        {isExec && Icon && <Icon className="w-3.5 h-3.5 text-white/35 shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-semibold ${isHuman ? "text-amber-300" : isOrchestrator ? "text-blue-300" : "text-white/70"}`}>
              {node.name}
            </span>
            {isHuman && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold uppercase tracking-wider border border-amber-500/20">Final Authority</span>}
            {isOrchestrator && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold uppercase tracking-wider border border-blue-500/20">Orchestrator</span>}
            {isExec && node.load !== undefined && (
              <span className={`text-[9px] font-mono ml-auto ${loadColor(node.load)}`}>{node.load}%</span>
            )}
          </div>
          <p className={`text-[9px] leading-none mt-0.5 ${isHuman ? "text-amber-400/40" : isOrchestrator ? "text-blue-400/40" : "text-white/25"}`}>{node.role}</p>
        </div>

        {isExec && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] text-white/20">{node.specialists.length} agents</span>
            <ChevronRight className="w-3 h-3 text-white/15" />
          </div>
        )}

        {hasChildren && !isExec && (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 hover:bg-white/[0.06] rounded transition-colors shrink-0">
            <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${expanded ? "" : "-rotate-90"}`} />
          </button>
        )}
      </div>

      {/* Specialists under exec (collapsed inline) */}
      {isExec && node.specialists && (
        <div className="ml-6 pl-4 border-l border-white/[0.04] mb-2">
          {node.specialists.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors group">
              <Cpu className="w-2.5 h-2.5 text-white/10 shrink-0" />
              <span className="text-[10px] text-white/30">{s}</span>
              <StatusBadge variant="active" dot={true} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">active</StatusBadge>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {hasChildren && expanded && !isExec && (
        <div className="mt-1">
          {node.children.map((child, i) => (
            <OrgNode key={i} node={child} depth={depth + 1} onSelectExec={onSelectExec} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const [activeTab, setActiveTab] = useState("orgchart");
  const [selectedExec, setSelectedExec] = useState(null);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-white/80 mb-1">Agents</h1>
        <p className="text-[11px] text-white/30">Governed AI workforce — authority chain, executives, specialists</p>
      </div>
      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "orgchart" && (
          <motion.div key="orgchart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Authority chain header */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4 overflow-x-auto">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {["Patrick", "Nettie", "Van · Perry · Torina · Dana · Icky · Funboy · Rab", "Specialists (28 total)"].map((n, i, arr) => (
                <span key={i} className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold ${i === 0 ? "text-amber-300" : i === 1 ? "text-blue-300" : "text-white/40"}`}>{n}</span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-white/15" />}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Left: full tree */}
              <GlassCard className="p-4">
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3">Chain of Command — Click executive to drill in</p>
                <OrgNode node={ORG_CHART} depth={0} onSelectExec={setSelectedExec} />
              </GlassCard>

              {/* Right: exec summary grid */}
              <div>
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3">Executive Summary — Load & Status</p>
                <div className="space-y-2">
                  {ORG_CHART.children[0].children.map((exec, i) => {
                    const Icon = exec.icon;
                    const d = EXEC_DETAILS[exec.name] || {};
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedExec(exec)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl glass-card border border-white/[0.04] hover:border-white/[0.08] transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-semibold text-white/70">{exec.name}</span>
                            <span className="text-[9px] text-white/25 truncate">{exec.role.split("·")[0].trim()}</span>
                          </div>
                          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden w-full">
                            <div className={`h-full rounded-full ${loadBarColor(exec.load)}`} style={{ width: `${exec.load}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[11px] font-bold font-mono ${loadColor(exec.load)}`}>{exec.load}%</span>
                          <span className="text-[8px] text-white/20">{d.activeTasks || 0} tasks · {exec.specialists.length} agents</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/40 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "hierarchy" && (
          <motion.div key="hier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-3">
              {/* Patrick */}
              <GlassCard className="border border-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold text-white/85">Patrick Camacho</span>
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase font-semibold">Final Authority</span>
                    </div>
                    <p className="text-[10px] text-white/30">Human Principal · All approvals terminate here · Issues high-level commands</p>
                  </div>
                </div>
              </GlassCard>

              {/* Nettie */}
              <GlassCard className="border border-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold text-white/85">Nettie</span>
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase font-semibold">Chief of Staff</span>
                      <StatusBadge variant="active" className="ml-auto">Online</StatusBadge>
                    </div>
                    <p className="text-[10px] text-white/30">Executive Assistant · Command Coordinator · Receives commands from Patrick, decomposes tasks, routes to executives, manages all QA gates</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 flex-wrap">
                  {Object.entries({ INTAKE: 2, SCOPED: 3, IN_PROGRESS: 8, EXEC_QA: 2, PERRY_QA: 1, NETTIE_QA: 3, APPROVAL: 2 }).map(([stage, count]) => (
                    <div key={stage} className="flex items-center gap-0.5">
                      <StageBadge stage={stage} />
                      <span className="text-[8px] text-white/20 font-mono mr-1">{count}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Executives grid */}
              <div>
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2 px-1">Tier 2 — Executive Department Heads (7)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {ORG_CHART.children[0].children.map((exec, i) => {
                    const Icon = exec.icon;
                    const d = EXEC_DETAILS[exec.name] || {};
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedExec(exec)}
                        className="glass-card rounded-2xl p-3.5 text-left border border-white/[0.05] hover:border-white/[0.10] transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-white/35" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white/75">{exec.name}</p>
                            <p className="text-[8px] text-white/25 truncate">{exec.role.split("·")[0].trim()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                          <div className="text-center p-1.5 rounded-lg bg-white/[0.02]">
                            <p className={`text-[13px] font-bold font-mono ${loadColor(exec.load)}`}>{exec.load}%</p>
                            <p className="text-[7px] text-white/15 uppercase">Load</p>
                          </div>
                          <div className="text-center p-1.5 rounded-lg bg-white/[0.02]">
                            <p className="text-[13px] font-bold text-white/60 font-mono">{d.activeTasks || 0}</p>
                            <p className="text-[7px] text-white/15 uppercase">Tasks</p>
                          </div>
                        </div>
                        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${loadBarColor(exec.load)}`} style={{ width: `${exec.load}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-white/20">{exec.specialists.length} specialists</span>
                          <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/40 transition-colors" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "models" && (
          <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {models.map((model, i) => (
                <GlassCard key={i} hover delay={i * 0.04} className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] text-white/70 font-semibold">{model.name}</p>
                        <span className="text-[9px] text-white/20">{model.provider}</span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">{model.usage}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-1 flex-wrap">
                        {model.depts.map((d, j) => (
                          <span key={j} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/25">{d}</span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-white/30">{model.cost}</span>
                      <StatusBadge variant="active" dot={true}>Live</StatusBadge>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executive detail drawer */}
      <AnimatePresence>
        {selectedExec && (
          <ExecDrawer exec={selectedExec} details={EXEC_DETAILS} onClose={() => setSelectedExec(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}