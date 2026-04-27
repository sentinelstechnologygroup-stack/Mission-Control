import { useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import EmptyState from "../components/mission-control/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Brain, Search, Globe, Filter, BookOpen, Clock, CheckCircle, AlertTriangle, ExternalLink, Activity } from "lucide-react";

const tabs = [
  { id: "docs", label: "Docs / Canon" },
  { id: "memory", label: "Memory" },
  { id: "search", label: "Search" },
  { id: "ecosystem", label: "Ecosystem" },
];

const docs = [
  { title: "Agent Operating Doctrine v3", type: "doctrine", status: "canonical", updated: "2d ago", owner: "Nettie" },
  { title: "Security Policy — Production", type: "policy", status: "canonical", updated: "5d ago", owner: "Within Core" },
  { title: "Brand Voice Guidelines", type: "policy", status: "canonical", updated: "1w ago", owner: "Sam" },
  { title: "Demo.ai Product Spec", type: "artifact", status: "approved", updated: "3d ago", owner: "Perry" },
  { title: "GTM Playbook v2", type: "artifact", status: "in review", updated: "1d ago", owner: "Sam" },
  { title: "Market Trends Report Q1", type: "report", status: "approved", updated: "4d ago", owner: "Ivy" },
  { title: "Deployment Runbook", type: "artifact", status: "canonical", updated: "1w ago", owner: "Nexus" },
  { title: "Agent Autonomy Levels", type: "doctrine", status: "canonical", updated: "2w ago", owner: "Patrick" },
];

const typeIcons = { doctrine: BookOpen, policy: FileText, artifact: FileText, report: FileText };
const statusVariants = { canonical: "active", approved: "info", "in review": "warning" };

const memories = [
  { title: "Daily Wrap-Up — April 7", type: "wrap-up", summary: "Demo.ai sprint completed. 3 PRs merged. Ivy flagged stale data sources. Cost under budget by 4%.", time: "Yesterday" },
  { title: "Executive Rollup — Week 14", type: "rollup", summary: "GTM strategy advancing. Security audit nearing completion. 2 new client builds scoped.", time: "Apr 5" },
  { title: "Lesson Learned: Rate Limiting", type: "lesson", summary: "Database rate limits hit during peak. Nexus implemented auto-scaling. Policy updated.", time: "Apr 3" },
  { title: "Doctrine Change: Autonomy v3", type: "change", summary: "Perry granted staging deploy autonomy. Production still requires Patrick approval.", time: "Apr 1" },
];

const ecosystemApps = [
  { name: "Demo.ai", status: "active", health: 97, users: "1.2K", revenue: "$4,200/mo", env: "Staging" },
  { name: "MeeshgCat", status: "review", health: 84, users: "340", revenue: "$0", env: "Development" },
  { name: "QuickView", status: "active", health: 99, users: "5.8K", revenue: "$12,400/mo", env: "Production" },
  { name: "Internal Tools", status: "active", health: 95, users: "12", revenue: "—", env: "Production" },
];

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState("docs");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredDocs = docs.filter((d) => typeFilter === "all" || d.type === typeFilter);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-white/80 mb-1">Knowledge</h1>
        <p className="text-[11px] text-white/30">Structured operating memory — docs, canon, ecosystem</p>
      </div>
      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "docs" && (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {["all", "doctrine", "policy", "artifact", "report"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    typeFilter === t ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
                  }`}
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredDocs.map((doc, i) => {
                const Icon = typeIcons[doc.type] || FileText;
                return (
                  <GlassCard key={i} hover delay={i * 0.03} className="p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/65 font-medium truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-white/20">{doc.owner}</span>
                          <span className="text-[9px] text-white/10">·</span>
                          <span className="text-[9px] text-white/20">{doc.updated}</span>
                        </div>
                      </div>
                      <StatusBadge variant={statusVariants[doc.status]} dot={false}>{doc.status}</StatusBadge>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "memory" && (
          <motion.div key="memory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {memories.map((m, i) => (
                <GlassCard key={i} hover delay={i * 0.04} className="p-3">
                  <div className="flex items-start gap-3">
                    <Brain className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[12px] text-white/65 font-medium">{m.title}</p>
                        <span className="text-[9px] text-white/15">{m.time}</span>
                      </div>
                      <p className="text-[11px] text-white/35 leading-relaxed">{m.summary}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "search" && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="max-w-2xl mx-auto">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all system knowledge..."
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl pl-10 pr-4 py-3 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
                />
              </div>
              {!searchQuery && (
                <EmptyState
                  icon={Search}
                  title="Search the knowledge base"
                  description="Query across docs, memory, artifacts, and system state"
                />
              )}
              {searchQuery && (
                <div className="space-y-2">
                  {docs.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase())).map((d, i) => (
                    <GlassCard key={i} hover className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-white/20" />
                        <p className="text-[11px] text-white/60 font-medium">{d.title}</p>
                        <span className="text-[9px] text-white/15 ml-auto">{d.type}</span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "ecosystem" && (
          <motion.div key="eco" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ecosystemApps.map((app, i) => (
                <GlassCard key={i} hover delay={i * 0.05}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-white/70">{app.name}</h3>
                    <StatusBadge variant={app.status === "active" ? "active" : "review"}>{app.env}</StatusBadge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-[14px] font-bold text-emerald-400 font-mono">{app.health}%</p>
                      <p className="text-[8px] text-white/25 uppercase">Health</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-[14px] font-bold text-white/60 font-mono">{app.users}</p>
                      <p className="text-[8px] text-white/25 uppercase">Users</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-[12px] font-bold text-white/50 font-mono">{app.revenue}</p>
                      <p className="text-[8px] text-white/25 uppercase">Revenue</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}