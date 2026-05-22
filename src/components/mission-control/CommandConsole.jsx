import { useState } from "react";
import GlassCard from "./GlassCard";
import { StageBadge } from "./LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Terminal, GitBranch, ChevronRight, Loader2, CheckCircle, X } from "lucide-react";

const COMMAND_EXAMPLES = [
  "Build a landing page for the new product launch",
  "Research competitor pricing for Q2 strategy",
  "Audit API security before next deployment",
  "Generate GTM content for MeeshgCat launch",
];

const ROUTING_PRESETS = {
  "landing page": { dept: "Perry", exec: "Perry (Development)", stage: "INTAKE", tasks: ["Design mockup", "Write copy", "Build frontend", "Deploy to staging"] },
  "research": { dept: "Ivy", exec: "Ivy (Intelligence)", stage: "INTAKE", tasks: ["Define research scope", "Scrape market data", "Synthesize findings", "Generate report"] },
  "audit": { dept: "Within Core", exec: "Within Core (Security)", stage: "INTAKE", tasks: ["Scan API surface", "Check access logs", "Review permissions", "Generate audit report"] },
  "content": { dept: "Sam", exec: "Sam (Growth)", stage: "INTAKE", tasks: ["Research audience", "Draft content", "Review & refine", "Schedule publish"] },
};

function getRouting(command) {
  const lower = command.toLowerCase();
  if (lower.includes("landing") || lower.includes("page") || lower.includes("build") || lower.includes("deploy")) return ROUTING_PRESETS["landing page"];
  if (lower.includes("research") || lower.includes("market") || lower.includes("competitor") || lower.includes("intel")) return ROUTING_PRESETS["research"];
  if (lower.includes("audit") || lower.includes("security") || lower.includes("scan")) return ROUTING_PRESETS["audit"];
  if (lower.includes("content") || lower.includes("gtm") || lower.includes("copy") || lower.includes("marketing")) return ROUTING_PRESETS["content"];
  return { dept: "Nettie", exec: "Nettie (Orchestrator)", stage: "INTAKE", tasks: ["Analyze command", "Route to department", "Create task breakdown", "Begin execution"] };
}

const traceSteps = [
  { label: "Patrick", role: "Command Issued", icon: "👤" },
  { label: "Nettie", role: "Routing & Decompose", icon: "🧠" },
  { label: "Executive", role: "Department Head", icon: "⚡" },
  { label: "Tasks", role: "Execution Queue", icon: "📋" },
  { label: "QA", role: "Quality Gate", icon: "🔍" },
  { label: "Approval", role: "Patrick Reviews", icon: "✅" },
];

export default function CommandConsole() {
  const [command, setCommand] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState(null);
  const [traceStep, setTraceStep] = useState(0);

  const handleSubmit = (cmd) => {
    const c = cmd || command;
    if (!c.trim()) return;
    setCommand(c);
    setSubmitted(true);
    setLoading(true);
    setTraceStep(0);

    // Simulate routing
    setTimeout(() => {
      setTrace(getRouting(c));
      setLoading(false);
      // Animate trace steps
      let step = 0;
      const interval = setInterval(() => {
        step += 1;
        setTraceStep(step);
        if (step >= traceSteps.length - 1) clearInterval(interval);
      }, 300);
    }, 1200);
  };

  const reset = () => {
    setCommand("");
    setSubmitted(false);
    setLoading(false);
    setTrace(null);
    setTraceStep(0);
  };

  return (
    <div className="space-y-3">
      {/* Command Input */}
      <GlassCard className="border border-white/[0.08]">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Patrick Command Input</span>
          <span className="ml-auto text-[9px] text-emerald-400/60 font-mono">AUTHORITY: FINAL</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Issue a high-level command to the system..."
            className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-3 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition-colors pr-10 font-mono"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!command.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-20 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Examples */}
        {!submitted && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {COMMAND_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(ex)}
                className="text-[9px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/30 hover:text-white/60 hover:border-white/[0.1] transition-all"
              >
                {ex.substring(0, 30)}…
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Command Trace View */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="border border-emerald-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Command Trace</span>
                </div>
                <button onClick={reset} className="p-1 rounded-lg hover:bg-white/[0.06] text-white/20 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Command text */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
                <p className="text-[11px] text-white/50 font-mono">"{command}"</p>
              </div>

              {/* Trace pipeline */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {traceSteps.map((step, i) => {
                  const isActive = i === traceStep && loading;
                  const isPast = i < traceStep || (!loading && i <= traceStep);
                  const isCurrent = !loading && i === traceStep;
                  return (
                    <div key={i} className="flex items-center shrink-0">
                      <div className={cn_local(
                        "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all",
                        isCurrent && "bg-emerald-500/10 border border-emerald-500/20",
                        isPast && !isCurrent && "opacity-70",
                        !isPast && !isActive && "opacity-20"
                      )}>
                        <span className="text-[12px]">{step.icon}</span>
                        <span className={`text-[8px] font-semibold ${isCurrent ? "text-emerald-400" : "text-white/40"}`}>{step.label}</span>
                        {isActive && <Loader2 className="w-2.5 h-2.5 text-emerald-400 animate-spin" />}
                        {isPast && !isActive && <CheckCircle className="w-2.5 h-2.5 text-emerald-400/60" />}
                      </div>
                      {i < traceSteps.length - 1 && (
                        <ChevronRight className={`w-3 h-3 mx-0.5 ${isPast ? "text-emerald-400/30" : "text-white/10"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Routing details */}
              {trace && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-white/25 uppercase mb-1">Routed To</p>
                      <p className="text-[11px] text-white/65 font-medium">{trace.dept}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-white/25 uppercase mb-1">Assigned Exec</p>
                      <p className="text-[11px] text-white/65 font-medium">{trace.exec}</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[8px] text-white/25 uppercase mb-1.5">Lifecycle Stage</p>
                    <StageBadge stage={trace.stage} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[8px] text-white/25 uppercase mb-2">Created Tasks</p>
                    <div className="space-y-1">
                      {trace.tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-white/20">{i + 1}.</span>
                          <span className="text-[10px] text-white/45">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400/70">Command accepted — routed to execution pipeline</span>
                  </div>
                </motion.div>
              )}

              {loading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                  <span className="text-[11px] text-white/25">Nettie is routing your command...</span>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn_local(...classes) {
  return classes.filter(Boolean).join(" ");
}