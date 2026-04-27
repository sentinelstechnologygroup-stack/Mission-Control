import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Target, Zap, FileText, User, ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const SEARCH_INDEX = [
  { type: "mission", label: "Demo.ai Platform", sub: "APPROVAL · Van", path: "/missions", color: "text-amber-400" },
  { type: "mission", label: "GTM Strategy Q2", sub: "NETTIE_QA · Torina", path: "/missions", color: "text-amber-400" },
  { type: "mission", label: "Security Audit v2", sub: "EXEC_QA · Perry", path: "/missions", color: "text-amber-400" },
  { type: "mission", label: "MeeshgCat Launch", sub: "IN_PROGRESS · Van", path: "/missions", color: "text-amber-400" },
  { type: "task", label: "Implement auth flow for Demo.ai", sub: "IN_PROGRESS · Forge", path: "/operations", color: "text-cyan-400" },
  { type: "task", label: "Security audit final sign-off", sub: "NETTIE_QA · Lock", path: "/operations", color: "text-cyan-400" },
  { type: "task", label: "Competitor pricing analysis", sub: "IN_PROGRESS · Scout", path: "/operations", color: "text-cyan-400" },
  { type: "agent", label: "Van — CTO / Operations", sub: "89% load · 7 specialists", path: "/agents", color: "text-blue-400" },
  { type: "agent", label: "Perry — CSO", sub: "62% load · 4 specialists", path: "/agents", color: "text-blue-400" },
  { type: "agent", label: "Nettie — Chief of Staff", sub: "Online · Orchestrator", path: "/nettie", color: "text-blue-400" },
  { type: "page", label: "Approvals", sub: "6 pending", path: "/approvals", color: "text-emerald-400" },
  { type: "page", label: "Intelligence", sub: "Research · Content · Analytics", path: "/intelligence", color: "text-emerald-400" },
  { type: "page", label: "Calendar", sub: "Milestones & deadlines", path: "/calendar", color: "text-emerald-400" },
  { type: "page", label: "System", sub: "Cost · Automations · Logs", path: "/system", color: "text-emerald-400" },
  { type: "artifact", label: "Deploy Package v2.4", sub: "Demo.ai · Van", path: "/operations", color: "text-purple-400" },
  { type: "artifact", label: "GTM Playbook v2", sub: "Q2 · Torina", path: "/intelligence", color: "text-purple-400" },
  { type: "artifact", label: "Security Audit Report", sub: "Perry · EXEC_QA", path: "/security", color: "text-purple-400" },
];

const typeIcon = { mission: Target, task: Zap, agent: User, page: ChevronRight, artifact: FileText };
const typeLabel = { mission: "MISSION", task: "TASK", agent: "AGENT", page: "PAGE", artifact: "ARTIFACT" };

const RECENT = ["Demo.ai deploy", "Van load", "Q2 budget", "GTM approval"];

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); open ? onClose() : null; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const results = query.trim().length > 0
    ? SEARCH_INDEX.filter(r =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const grouped = results.reduce((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(5,7,10,0.85)", backdropFilter: "blur(4px)" }}
          />

          {/* Search panel */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="fixed top-16 left-1/2 z-[101] w-full max-w-xl -translate-x-1/2"
            style={{ borderRadius: 8 }}
          >
            <div className="glass-card border overflow-hidden" style={{ borderColor: "rgba(32,200,120,0.20)" }}>
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(32,200,120,0.08)" }}>
                <Search className="w-4 h-4 text-emerald-400/60 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search missions, tasks, agents, artifacts..."
                  className="flex-1 bg-transparent text-[13px] text-white/75 placeholder:text-white/20 focus:outline-none font-mono"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[8px] text-white/15 border border-white/[0.08] rounded px-1.5 py-0.5 font-mono">ESC</span>
                  <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06] text-white/20 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query.trim().length === 0 ? (
                  <div className="p-4">
                    <p className="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono">Recent Searches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RECENT.map((r, i) => (
                        <button key={i} onClick={() => setQuery(r)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/35 hover:text-white/65 hover:bg-white/[0.07] transition-colors font-mono">
                          <Clock className="w-2.5 h-2.5" />{r}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[11px] text-white/20 font-mono">No results for "{query}"</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(grouped).map(([type, items]) => {
                      const Icon = typeIcon[type] || ChevronRight;
                      return (
                        <div key={type} className="mb-3">
                          <p className="text-[7px] text-white/15 uppercase tracking-widest font-mono px-2 mb-1">{typeLabel[type]}</p>
                          {items.map((item, i) => (
                            <Link key={i} to={item.path} onClick={onClose}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors group cursor-pointer">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-white/70 font-medium truncate">{item.label}</p>
                                <p className="text-[9px] text-white/25 font-mono">{item.sub}</p>
                              </div>
                              <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/40 transition-colors shrink-0" />
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t flex items-center gap-3" style={{ borderColor: "rgba(32,200,120,0.06)" }}>
                {[["↵", "Open"], ["↑↓", "Navigate"], ["ESC", "Close"]].map(([k, l]) => (
                  <span key={k} className="flex items-center gap-1 text-[8px] text-white/15 font-mono">
                    <span className="border border-white/[0.10] rounded px-1 py-0.5">{k}</span>{l}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}