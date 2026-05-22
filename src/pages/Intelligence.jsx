import { useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Telescope, Pen, Calendar, X, Send, CheckCircle,
  Clock, ArrowRight, Plus, Sparkles, Filter, Bookmark, Eye, ChevronRight, Users, Globe, Zap, Target, Archive
} from "lucide-react";

const tabs = [
  { id: "research", label: "Research Feed" },
  { id: "content", label: "Content Studio" },
  { id: "scheduler", label: "Scheduler" },
  { id: "analytics", label: "Analytics" },
];

// ===========================================================
// DATA
// ===========================================================
const signals = [
  { id: 1, category: "Growth", title: "AI-native SaaS tools growing 3x faster than traditional software", source: "TechCrunch", strength: "high", age: "2h ago", tags: ["AI", "SaaS", "Market"], cluster: "AI Market Trends" },
  { id: 2, category: "Product", title: "Enterprise clients want single-pane AI command dashboards", source: "Gartner Survey", strength: "high", age: "4h ago", tags: ["Enterprise", "UX", "Dashboard"], cluster: "Product Intelligence" },
  { id: 3, category: "Clients", title: "3 inbound leads from Demo.ai campaign — unresponded", source: "CRM Feed", strength: "critical", age: "1h ago", tags: ["Lead", "Demo.ai"], cluster: "Client Signals" },
  { id: 4, category: "Content", title: "Thread format on 'AI workforce' getting 4x avg impressions", source: "X Analytics", strength: "medium", age: "6h ago", tags: ["Content", "Twitter", "AI"], cluster: "Content Performance" },
  { id: 5, category: "Growth", title: "Competitor launched similar product — early traction on Product Hunt", source: "Product Hunt", strength: "high", age: "5h ago", tags: ["Competitor", "Product"], cluster: "AI Market Trends" },
  { id: 6, category: "Product", title: "Users requesting approval workflow mobile support", source: "Feedback Feed", strength: "medium", age: "3h ago", tags: ["Mobile", "Approvals"], cluster: "Product Intelligence" },
  { id: 7, category: "Clients", title: "Enterprise RFP received — 90-day contract, potential $24K", source: "Email", strength: "critical", age: "30m ago", tags: ["RFP", "Enterprise", "Client"], cluster: "Client Signals" },
  { id: 8, category: "Growth", title: "LinkedIn algorithm favoring long-form AI content this week", source: "LinkedIn Analytics", strength: "medium", age: "8h ago", tags: ["LinkedIn", "Content"], cluster: "Content Performance" },
];

const clusters = [...new Set(signals.map(s => s.cluster))];

// Thumbnail options per draft (6 options each)
const THUMBNAILS = {
  1: [
    { emoji: "🧵", label: "Thread cover" },
    { emoji: "📊", label: "Data chart" },
    { emoji: "🤖", label: "AI robot" },
    { emoji: "⚡", label: "Power" },
    { emoji: "🎯", label: "Target" },
    { emoji: "🏗️", label: "Build" },
  ],
  2: [
    { emoji: "🚀", label: "Launch" },
    { emoji: "⚡", label: "Speed" },
    { emoji: "🎯", label: "Target" },
    { emoji: "💡", label: "Innovation" },
    { emoji: "🔥", label: "Hot" },
    { emoji: "✨", label: "Sparkle" },
  ],
  3: [
    { emoji: "📝", label: "Article" },
    { emoji: "🔨", label: "Build" },
    { emoji: "✨", label: "Polish" },
    { emoji: "🏗️", label: "Structure" },
    { emoji: "📦", label: "Product" },
    { emoji: "⚙️", label: "Engine" },
  ],
};

const PLATFORMS = [
  { id: "x", label: "X (Twitter)", icon: "𝕏", color: "text-white/60" },
  { id: "linkedin", label: "LinkedIn", icon: "in", color: "text-blue-400" },
  { id: "blog", label: "Blog / Article", icon: "✍", color: "text-white/40" },
  { id: "email", label: "Email Newsletter", icon: "✉", color: "text-amber-400" },
];

const CONTENT_STAGES = ["Draft", "In Review", "Approved", "Scheduled", "Published"];
const stageVariant = { "Draft": "idle", "In Review": "warning", "Approved": "active", "Scheduled": "info", "Published": "active" };

const drafts = [
  {
    id: 1, title: "The AI Company Without Humans", type: "Thread",
    stage: "APPROVAL", platform: ["x"], preview: "What if your entire company ran on AI agents with one human at the top? Here's how we built exactly that — and what we learned in the first 90 days...",
    owner: "Quill / Torina", created: "Today", wordCount: 1240, engagement: null,
    linkedSignal: "Thread format on 'AI workforce' getting 4x avg impressions",
    linkedMission: "GTM Strategy Q2",
  },
  {
    id: 2, title: "MeeshgCat Launch Announcement", type: "Post",
    stage: "NETTIE_QA", platform: ["x", "linkedin"], preview: "Introducing MeeshgCat — the fastest way to build AI-governed workflows. We went from zero to production in 6 days using an AI-only build team. Now in beta.",
    owner: "Quill / Torina", created: "Yesterday", wordCount: 280, engagement: null,
    linkedSignal: null, linkedMission: "MeeshgCat Content",
  },
  {
    id: 3, title: "Behind the Build: Demo.ai — 6 Days to Production", type: "Article",
    stage: "IN_PROGRESS", platform: ["blog"], preview: "A case study on building a full SaaS product in 6 days with an AI workforce — what worked, what broke, and what we'd do differently.",
    owner: "Quill", created: "2d ago", wordCount: 3100, engagement: null,
    linkedSignal: "AI-native SaaS tools growing 3x faster", linkedMission: "Demo.ai Platform",
  },
];

const calendarItems = [
  { day: "Mon Apr 7", items: [{ title: "AI Workforce Thread", time: "9:00 AM", platform: "X", stage: "Published" }] },
  { day: "Tue Apr 8", items: [{ title: "MeeshgCat Launch Post", time: "11:00 AM", platform: "X", stage: "Scheduled" }, { title: "Behind the Build Article", time: "2:00 PM", platform: "Blog", stage: "Draft" }] },
  { day: "Wed Apr 9", items: [{ title: "Q2 Strategy Thread", time: "10:00 AM", platform: "X", stage: "Draft" }] },
  { day: "Thu Apr 10", items: [] },
  { day: "Fri Apr 11", items: [{ title: "Weekly Recap Post", time: "4:00 PM", platform: "LinkedIn", stage: "Draft" }] },
];

const analyticsData = [
  { label: "Impressions (7d)", value: "84.2K", trend: "+18%", good: true },
  { label: "Engagements", value: "3,140", trend: "+24%", good: true },
  { label: "Profile Visits", value: "1,280", trend: "+9%", good: true },
  { label: "Follower Growth", value: "+142", trend: "+3%", good: true },
];

const categoryColors = { Growth: "info", Product: "review", Clients: "critical", Content: "active" };
const strengthColors = { high: "active", medium: "warning", critical: "critical" };

// ===========================================================
// SIGNAL ACTION DRAWER
// ===========================================================
function SignalDrawer({ signal, onClose }) {
  const [converted, setConverted] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 320 }}
      className="fixed inset-y-0 right-0 w-80 z-50 border-l border-white/[0.06] p-5 overflow-y-auto"
      style={{ top: "44px", background: "hsl(225 12% 7%)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <StatusBadge variant={categoryColors[signal.category]}>{signal.category}</StatusBadge>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-[13px] font-bold text-white/80 leading-snug mb-2">{signal.title}</p>
      <div className="flex items-center gap-2 mb-5">
        <Globe className="w-3 h-3 text-white/20" />
        <span className="text-[9px] text-white/25">{signal.source}</span>
        <span className="text-[8px] text-white/15 font-mono ml-auto">{signal.age}</span>
        <StatusBadge variant={strengthColors[signal.strength]} dot={true}>{signal.strength}</StatusBadge>
      </div>

      {converted ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <p className="text-[11px] text-emerald-400 font-semibold">Signal converted to task</p>
          <p className="text-[9px] text-emerald-400/60 mt-0.5">Routed to Funboy → Scout</p>
        </div>
      ) : (
        <>
          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2.5">Convert This Signal</p>
          <div className="space-y-1.5 mb-5">
            {[
              { icon: Zap, label: "Convert to Task", sub: "Route to Funboy / Scout", color: "text-cyan-400", bg: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/15" },
              { icon: Target, label: "Convert to Mission", sub: "Create new mission scope", color: "text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/15" },
              { icon: Pen, label: "Send to Content Studio", sub: "Torina → Quill drafts", color: "text-purple-400", bg: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/15" },
              { icon: Send, label: "Escalate to Nettie", sub: "Add to briefing queue", color: "text-orange-400", bg: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/15" },
              { icon: Bookmark, label: "Save to Knowledge", sub: "Index in knowledge base", color: "text-emerald-400", bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/15" },
              { icon: Users, label: "Assign to Executive", sub: "Manual routing", color: "text-white/45", bg: "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]" },
              { icon: Archive, label: "Mark Ignored", sub: "Remove from feed", color: "text-white/20", bg: "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04]" },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button key={i} onClick={() => i === 0 && setConverted(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${action.bg}`}>
                  <Icon className={`w-4 h-4 ${action.color} shrink-0`} />
                  <div className="text-left">
                    <p className={`text-[11px] font-semibold ${action.color}`}>{action.label}</p>
                    <p className="text-[8px] text-white/20">{action.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="pt-4 border-t border-white/[0.05]">
        <p className="text-[8px] text-white/20 uppercase mb-1.5">Cluster</p>
        <span className="px-2 py-1 rounded bg-white/[0.04] text-[9px] text-white/30">{signal.cluster}</span>
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {signal.tags.map((t, i) => <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.03] text-white/20">{t}</span>)}
        </div>
      </div>
    </motion.div>
  );
}

// ===========================================================
// CONTENT DRAFT CARD
// ===========================================================
function DraftCard({ draft, thumbState, onThumbChange }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(draft.platform);
  const thumbs = THUMBNAILS[draft.id] || [];
  const selectedThumb = thumbState[draft.id] ?? 0;

  const togglePlatform = (pid) => {
    setSelectedPlatforms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  return (
    <GlassCard hover className="p-0 overflow-hidden border border-white/[0.05]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Pen className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <p className="text-[13px] font-bold text-white/75">{draft.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StageBadge stage={draft.stage} />
              <span className="text-[9px] text-white/20">{draft.type}</span>
              <span className="text-[9px] text-white/15">{draft.wordCount} words</span>
              <span className="text-[9px] text-white/15">{draft.created}</span>
              <span className="text-[9px] text-white/20 ml-auto">by {draft.owner}</span>
            </div>
          </div>
        </div>

        {/* Preview text */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5 mb-3">
          <p className="text-[11px] text-white/40 leading-relaxed italic">"{draft.preview}"</p>
        </div>

        {/* Linked signal/mission */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {draft.linkedSignal && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/15 text-[8px] text-purple-400">
              <Telescope className="w-2.5 h-2.5" />Source signal: {draft.linkedSignal.substring(0, 35)}…
            </div>
          )}
          {draft.linkedMission && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/15 text-[8px] text-blue-400">
              <Target className="w-2.5 h-2.5" />Mission: {draft.linkedMission}
            </div>
          )}
        </div>
      </div>

      {/* Platform selector */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <p className="text-[8px] text-white/20 uppercase tracking-wider mb-2">Target Platforms</p>
        <div className="flex items-center gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => togglePlatform(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                selectedPlatforms.includes(p.id)
                  ? "bg-white/[0.08] border-white/[0.15] text-white/70"
                  : "bg-white/[0.02] border-white/[0.05] text-white/20 hover:text-white/45"
              }`}>
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thumbnail selector — 6 options */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[8px] text-white/20 uppercase tracking-wider">Image / Thumbnail ({thumbs.length} options)</p>
          <button className="flex items-center gap-1 text-[8px] text-purple-400/60 hover:text-purple-400 transition-colors">
            <Sparkles className="w-2.5 h-2.5" />Generate AI image
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {thumbs.map((t, j) => (
            <button key={j} onClick={() => onThumbChange(draft.id, j)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
                selectedThumb === j
                  ? "bg-white/[0.12] ring-1 ring-white/30 scale-105"
                  : "bg-white/[0.03] hover:bg-white/[0.07]"
              }`}>
              <span className="text-[20px]">{t.emoji}</span>
              <span className="text-[7px] text-white/20 truncate w-full text-center">{t.label}</span>
            </button>
          ))}
          <button className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] hover:bg-white/[0.05] transition-colors">
            <Plus className="w-3.5 h-3.5 text-white/20" />
            <span className="text-[7px] text-white/20">Upload</span>
          </button>
        </div>
        {thumbs[selectedThumb] && (
          <p className="text-[8px] text-white/25 mt-1.5">Selected: <span className="text-white/40">{thumbs[selectedThumb].label}</span></p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-semibold transition-colors border border-emerald-500/20">
          <CheckCircle className="w-3.5 h-3.5" />Approve
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-semibold transition-colors border border-blue-500/15">
          <Calendar className="w-3.5 h-3.5" />Schedule
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/35 text-[10px] font-medium transition-colors border border-white/[0.06]">
          <Eye className="w-3.5 h-3.5" />Preview
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400/70 text-[10px] font-medium transition-colors border border-amber-500/15 ml-auto">
          <ArrowRight className="w-3.5 h-3.5" />Return to Torina
        </button>
      </div>
    </GlassCard>
  );
}

// ===========================================================
// MAIN PAGE
// ===========================================================
export default function Intelligence() {
  const [activeTab, setActiveTab] = useState("research");
  const [catFilter, setCatFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [thumbState, setThumbState] = useState({});

  const handleThumbChange = (draftId, idx) => {
    setThumbState(prev => ({ ...prev, [draftId]: idx }));
  };

  const filteredSignals = signals.filter(s => {
    if (catFilter !== "all" && s.category !== catFilter) return false;
    if (clusterFilter !== "all" && s.cluster !== clusterFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-white/80 mb-1">Intelligence</h1>
        <p className="text-[11px] text-white/30">Research signals → Content Studio → Scheduler → Analytics</p>
      </div>

      {/* Content pipeline flow indicator */}
      <div className="flex items-center gap-1.5 px-4 py-2 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-x-auto">
        {["Signal", "Draft", "Images", "Review", "Approve", "Schedule", "Publish", "Analyze"].map((s, i, arr) => (
          <span key={i} className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${i <= 2 ? "text-white/50" : "text-white/20"}`}>{s}</span>
            {i < arr.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-white/12" />}
          </span>
        ))}
      </div>

      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">

        {/* ===== RESEARCH FEED ===== */}
        {activeTab === "research" && (
          <motion.div key="research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-white/20 shrink-0" />
              {["all", "Growth", "Product", "Clients", "Content"].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${catFilter === cat ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              {["all", ...clusters].map(c => (
                <button key={c} onClick={() => setClusterFilter(c)}
                  className={`px-2 py-1 rounded text-[8px] transition-colors ${clusterFilter === c ? "bg-white/[0.06] text-white/50" : "text-white/15 hover:text-white/35"}`}>
                  {c === "all" ? "All Clusters" : c}
                </button>
              ))}
              <span className="ml-auto text-[9px] text-white/20 font-mono">{filteredSignals.length} signals</span>
            </div>

            <div className="space-y-2">
              {filteredSignals.map((signal, i) => (
                <GlassCard key={signal.id} hover delay={i * 0.03} className="p-3">
                  <div className="flex items-start gap-3">
                    <Telescope className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[12px] text-white/65 font-semibold leading-tight">{signal.title}</p>
                        <StatusBadge variant={strengthColors[signal.strength]} dot={true} className="shrink-0">{signal.strength}</StatusBadge>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Globe className="w-3 h-3 text-white/15" />
                        <span className="text-[9px] text-white/25">{signal.source}</span>
                        <span className="text-[8px] text-white/15 font-mono">{signal.age}</span>
                        <StatusBadge variant={categoryColors[signal.category]} dot={false}>{signal.category}</StatusBadge>
                        <span className="text-[8px] text-white/12 px-1.5 py-0.5 rounded bg-white/[0.03]">{signal.cluster}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {signal.tags.map((t, j) => <span key={j} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/20">{t}</span>)}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSignal(signal)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/40 text-[9px] font-semibold transition-colors border border-white/[0.06]">
                      <Zap className="w-3 h-3" />Act
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== CONTENT STUDIO ===== */}
        {activeTab === "content" && (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Pipeline stages */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
              {CONTENT_STAGES.map((s, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <StatusBadge variant={stageVariant[s]} dot={false}>{s}</StatusBadge>
                  {i < CONTENT_STAGES.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-white/10" />}
                </div>
              ))}
              <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-[10px] transition-colors shrink-0">
                <Plus className="w-3 h-3" />New Draft
              </button>
            </div>

            <div className="space-y-4">
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  thumbState={thumbState}
                  onThumbChange={handleThumbChange}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== SCHEDULER ===== */}
        {activeTab === "scheduler" && (
          <motion.div key="sched" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Publishing Queue — April 2026</h3>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-[10px] transition-colors">
                  <Plus className="w-3 h-3" />Schedule Post
                </button>
              </div>
              <div className="space-y-1.5">
                {calendarItems.map((day, i) => (
                  <div key={i} className={`rounded-xl overflow-hidden ${day.items.length ? "border border-white/[0.04]" : ""}`}>
                    <div className="flex items-center gap-3 p-2.5">
                      <span className="text-[9px] font-mono text-white/30 w-24 shrink-0">{day.day}</span>
                      {day.items.length === 0 ? (
                        <span className="text-[9px] text-white/10 italic">No posts scheduled</span>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {day.items.map((item, j) => (
                            <div key={j} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] cursor-pointer transition-colors border border-white/[0.04]">
                              <Clock className="w-3 h-3 text-white/20" />
                              <span className="text-[10px] text-white/50">{item.title}</span>
                              <span className="text-[8px] text-white/20">{item.time}</span>
                              <StatusBadge variant={stageVariant[item.stage] || "idle"} dot={false}>{item.stage}</StatusBadge>
                              <span className="text-[8px] text-white/25 px-1.5 py-0.5 rounded bg-white/[0.04]">{item.platform}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ===== ANALYTICS ===== */}
        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {analyticsData.map((a, i) => (
                <GlassCard key={i} delay={i * 0.04} className="text-center p-4">
                  <p className="text-[22px] font-bold text-white/80 font-mono">{a.value}</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">{a.label}</p>
                  <p className={`text-[11px] font-semibold mt-1 ${a.good ? "text-emerald-400" : "text-red-400"}`}>{a.trend}</p>
                </GlassCard>
              ))}
            </div>
            <GlassCard>
              <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">Top Performing Content</h3>
              <div className="space-y-2">
                {[
                  { title: "AI Workforce Thread", impressions: "42.1K", eng: "1,840", platform: "X", trend: "+34%" },
                  { title: "Demo.ai Build Case Study", impressions: "18.6K", eng: "720", platform: "Blog", trend: "+12%" },
                  { title: "MeeshgCat Teaser", impressions: "14.2K", eng: "580", platform: "X", trend: "+8%" },
                  { title: "Q1 Market Analysis", impressions: "9.3K", eng: "340", platform: "LinkedIn", trend: "+5%" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/60 font-medium truncate">{p.title}</p>
                      <span className="text-[9px] text-white/20">{p.platform}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-white/50 font-mono">{p.impressions}</p>
                        <p className="text-[7px] text-white/20">impressions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-emerald-400 font-mono">{p.eng}</p>
                        <p className="text-[7px] text-white/20">engagements</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400">{p.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSignal && <SignalDrawer signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
      </AnimatePresence>
    </div>
  );
}