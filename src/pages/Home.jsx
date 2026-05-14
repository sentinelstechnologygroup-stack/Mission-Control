import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import CommandConsole from "../components/mission-control/CommandConsole";
import NettieOrchestrationPanel from "../components/mission-control/NettieOrchestrationPanel";
import CostPanel from "../components/mission-control/CostPanel";
import SecurityCard from "../components/mission-control/SecurityCard";
import DepartmentStatusBar from "../components/mission-control/DepartmentStatusBar";
import ActivityFeed from "../components/mission-control/ActivityFeed";
import MissionHealthCards from "../components/mission-control/MissionHealthCards";
import RecentArtifacts from "../components/mission-control/RecentArtifacts";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Clock, AlertTriangle, Sunrise, Crown, ChevronRight, X,
  Inbox, Star, Zap, Target, ArrowUpRight, Shield, DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";

const defaultQuickStats = [
  { label: "Active Jobs", value: "24", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Pending QA", value: "7", color: "text-amber-400", bg: "bg-amber-500/10" },
  { label: "Approved Today", value: "12", color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Escalations", value: "3", color: "text-red-400", bg: "bg-red-500/10" },
];

const inboxItems = [
  { id: 1, type: "approval", title: "Demo.ai Website — Ready for Production", from: "Nettie", time: "9m", priority: "critical", stage: "APPROVAL", action: "Approve" },
  { id: 2, type: "approval", title: "Q2 Budget Allocation Decision Required", from: "Nettie", time: "1h", priority: "high", stage: "APPROVAL", action: "Review" },
  { id: 3, type: "escalation", title: "Client Build Delays — Perry at 89% capacity", from: "Perry", time: "2h", priority: "high", stage: "IN_PROGRESS", action: "Act" },
  { id: 4, type: "signal", title: "Competitor product launched — GTM response needed", from: "Ivy", time: "4h", priority: "high", stage: "INTAKE", action: "Review" },
  { id: 5, type: "review", title: "Security Audit Report v2 awaiting sign-off", from: "Within Core", time: "5h", priority: "medium", stage: "EXEC_QA", action: "Review" },
];

const typeIcon = { approval: "✅", escalation: "⚡", signal: "📡", review: "🔍" };
const priorityVariant = { critical: "critical", high: "warning", medium: "info", low: "idle" };

function InboxDrawer({ item, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-white/[0.08] bg-[#090b0e]/98 backdrop-blur-xl sm:w-96"
      style={{ top: "52px" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeIcon[item.type]}</span>
            <StatusBadge variant={priorityVariant[item.priority]}>{item.priority}</StatusBadge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-[15px] font-semibold text-white/80 mb-2">{item.title}</h2>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] text-white/25">From: {item.from}</span>
          <span className="text-[9px] text-white/10">·</span>
          <span className="text-[9px] text-white/15 font-mono">{item.time} ago</span>
          <StageBadge stage={item.stage} className="ml-auto" />
        </div>

        {item.type === "approval" && (
          <div className="space-y-2 mb-5">
            <div className="p-3 rounded-xl bg-white/[0.02]">
              <p className="text-[11px] text-white/45 leading-relaxed">
                All QA gates have passed. This item is ready for your final approval. Nettie has reviewed and signed off. Perry has confirmed the build is production-ready.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/25 transition-colors">
                ✓ Approve
              </button>
              <button className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors">
                ✗ Reject
              </button>
            </div>
            <button className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 text-[11px] font-medium hover:bg-amber-500/20 transition-colors">
              ↩ Return for Rework
            </button>
          </div>
        )}
        {item.type === "escalation" && (
          <div className="space-y-2 mb-5">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-[11px] text-white/45 leading-relaxed">
                Perry is at 89% capacity. Client build timeline is at risk of slipping 2 days. Requires your decision on prioritization or resource allocation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 rounded-xl bg-white/[0.06] text-white/40 text-[10px] font-medium hover:bg-white/[0.10] transition-colors">Authorize Overtime</button>
              <button className="py-2 rounded-xl bg-white/[0.06] text-white/40 text-[10px] font-medium hover:bg-white/[0.10] transition-colors">De-prioritize Internal</button>
              <button className="py-2 rounded-xl bg-white/[0.06] text-white/40 text-[10px] font-medium hover:bg-white/[0.10] transition-colors">Extend Timeline</button>
              <button className="py-2 rounded-xl bg-white/[0.06] text-white/40 text-[10px] font-medium hover:bg-white/[0.10] transition-colors">Escalate to Nettie</button>
            </div>
          </div>
        )}
        {(item.type === "signal" || item.type === "review") && (
          <div className="space-y-2 mb-5">
            <div className="p-3 rounded-xl bg-white/[0.02]">
              <p className="text-[11px] text-white/45 leading-relaxed">
                {item.type === "signal" ? "Intelligence signal flagged by Ivy. Competitor product has gained early traction on Product Hunt. Sam has drafted a GTM response. Review before end of day." : "Review package is ready for your inspection. All supporting documents attached."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors">View Full Report</button>
              <button className="py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors">Mark Reviewed</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [selectedInbox, setSelectedInbox] = useState(null);
  const { data: dashboard } = useQuery({
    queryKey: ["home", "dashboard"],
    queryFn: api.dashboard,
    refetchInterval: 10000,
  });

  const quickStats = dashboard?.counts
    ? [
        { label: "Active Jobs", value: String(dashboard.counts.activeJobs ?? 0), color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "Pending QA", value: String(dashboard.counts.qa ?? 0), color: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Approved Today", value: String(dashboard.counts.approvals ?? 0), color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Escalations", value: String(dashboard.counts.blockedJobs ?? 0), color: "text-red-400", bg: "bg-red-500/10" },
      ]
    : defaultQuickStats;

  return (
    <div className="space-y-4">
      {/* Authority chain */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-x-auto">
        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-[10px] font-semibold text-amber-400/80 shrink-0">Patrick</span>
        <span className="text-white/10 shrink-0">→</span>
        <span className="text-[10px] font-medium text-blue-400/70 shrink-0">Nettie</span>
        <span className="text-white/10 shrink-0">→</span>
        <span className="text-[9px] text-white/20 shrink-0">Perry · Within Core · Ivy · Sam · Nexus</span>
        <span className="text-white/10 shrink-0">→</span>
        <span className="text-[9px] text-white/15 shrink-0">Specialists</span>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-400/50 font-mono">System Operational</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
        <span className="text-[11px] font-mono font-semibold tracking-[0.18em] text-emerald-300">LINUX RUNTIME TEST</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((stat, i) => (
          <GlassCard key={i} delay={i * 0.04} className="flex items-center gap-3 py-3">
            <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <span className={`text-[18px] font-bold font-mono ${stat.color}`}>{stat.value}</span>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider">{stat.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Nettie Panel */}
      <NettieOrchestrationPanel />

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Left: Patrick Inbox + Command */}
        <div className="space-y-4">
          {/* Patrick Inbox */}
          <GlassCard delay={0.05} className="border border-amber-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">Patrick's Inbox</span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">{inboxItems.length}</span>
            </div>
            <div className="space-y-1.5">
              {inboxItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedInbox(item)}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] hover:border-white/[0.07] transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[12px] shrink-0 mt-0.5">{typeIcon[item.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60 font-medium leading-tight truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[8px] text-white/20">{item.from}</span>
                        <StatusBadge variant={priorityVariant[item.priority]} dot={false} className="text-[7px]">{item.priority}</StatusBadge>
                        <span className="text-[8px] text-white/15 font-mono ml-auto">{item.time}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
            <Link to="/nettie" className="flex items-center gap-1 mt-3 text-[10px] text-blue-400/50 hover:text-blue-400/80 transition-colors">
              <span>Open Nettie Console</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </GlassCard>

          <CommandConsole />
        </div>

        {/* Center */}
        <div className="lg:col-span-2 space-y-4">
          <DepartmentStatusBar />
          <MissionHealthCards />
          <ActivityFeed />
        </div>

        {/* Right */}
        <div className="space-y-4">
          <CostPanel />
          <SecurityCard />
          <RecentArtifacts />
        </div>
      </div>

      {/* Daily Wrap-Up */}
      <GlassCard delay={0.3}>
        <div className="flex items-center gap-2 mb-3">
          <Sunrise className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Daily Wrap-Up</h3>
          <span className="ml-auto text-[9px] text-white/15 font-mono">April 8, 2026</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {[
            { label: "Development", color: "text-emerald-400", text: "Demo.ai frontend deployed to staging. 3 PRs merged, 1 blocked on security review. Perry running at 89% capacity." },
            { label: "Growth", color: "text-blue-400", text: "GTM playbook v2 submitted for review. Sam completed competitor analysis. 2 new market segments identified." },
            { label: "Security", color: "text-amber-400", text: "1 anomaly detected — description drift on API schema. Within Core investigating. No active breaches. Infra health at 94%." },
          ].map((item, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors">
              <p className="text-[11px] text-white/50 leading-relaxed">
                <span className={`${item.color} font-semibold`}>{item.label}:</span> {item.text}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Inbox drawer */}
      <AnimatePresence>
        {selectedInbox && <InboxDrawer item={selectedInbox} onClose={() => setSelectedInbox(null)} />}
      </AnimatePresence>
    </div>
  );
}