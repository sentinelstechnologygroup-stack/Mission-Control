import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "./StatusBadge";
import { Terminal, Play, Square, RefreshCw, Download, ChevronRight, Circle } from "lucide-react";

const BUILD_JOBS = [
  {
    id: "job-0492",
    name: "Demo.ai v2.4 — Production Deploy",
    dept: "Van / Forge",
    status: "success",
    duration: "4m 12s",
    timestamp: "12:47",
    steps: [
      { label: "Install dependencies", status: "success", dur: "18s", output: ["npm ci — 1,284 packages installed", "No vulnerabilities found"] },
      { label: "Type check", status: "success", dur: "6s", output: ["tsc --noEmit", "✓ 0 errors, 0 warnings"] },
      { label: "Run test suite", status: "success", dur: "34s", output: ["PASS src/auth.test.ts (12 tests)", "PASS src/api.test.ts (8 tests)", "PASS src/ui.test.ts (24 tests)", "All 44 tests passed"] },
      { label: "Build bundle", status: "success", dur: "52s", output: ["vite build --mode production", "dist/index.js  412kb (gzip: 128kb)", "dist/assets/   89 files", "✓ Build complete"] },
      { label: "Deploy to staging", status: "success", dur: "1m 4s", output: ["Uploading 89 assets...", "CDN invalidation triggered", "Health check: GET /api/ping → 200 OK (38ms)", "✓ Staging live at staging.demo.ai"] },
      { label: "Perry security scan", status: "success", dur: "28s", output: ["Running OWASP scan...", "0 critical · 0 high · 2 info", "✓ Security gate passed — Perry sign-off confirmed"] },
      { label: "Promote to production", status: "success", dur: "50s", output: ["Blue/green swap initiated", "Traffic routed: 100% → production", "Smoke test: 5/5 checks passed", "✓ Production live at demo.ai"] },
    ]
  },
  {
    id: "job-0491",
    name: "Market Signal Indexer — Batch 7",
    dept: "Funboy / Drift",
    status: "running",
    duration: "2m 18s",
    timestamp: "12:42",
    steps: [
      { label: "Fetch signal sources", status: "success", dur: "12s", output: ["Polling 18 sources...", "16 sources OK · 2 stale (skipped)", "Fetched 847 raw items"] },
      { label: "Parse & clean", status: "success", dur: "22s", output: ["Deduplication: 847 → 612 unique", "Noise filter: 612 → 418 valid", "NLP enrichment applied"] },
      { label: "Cluster & rank", status: "running", dur: "—", output: ["Running semantic clustering...", "Identified 14 clusters so far..."] },
      { label: "Index to knowledge base", status: "pending", dur: "—", output: [] },
      { label: "Notify Funboy", status: "pending", dur: "—", output: [] },
    ]
  },
  {
    id: "job-0489",
    name: "Security Anomaly Scan",
    dept: "Perry / Sentry",
    status: "success",
    duration: "1m 47s",
    timestamp: "11:59",
    steps: [
      { label: "Auth log analysis", status: "success", dur: "18s", output: ["Scanned 14,284 auth events", "0 brute force patterns", "0 privilege escalation attempts"] },
      { label: "Dependency audit", status: "success", dur: "24s", output: ["npm audit — 0 critical", "2 moderate (known · not exploitable)"] },
      { label: "Network anomaly check", status: "success", dur: "38s", output: ["Egress anomaly score: 0.04 (normal)", "No unexpected outbound connections"] },
      { label: "Write report", status: "success", dur: "27s", output: ["Report: security-scan-2026-04-08-1159.json", "✓ Saved to Knowledge Base"] },
    ]
  },
  {
    id: "job-0488",
    name: "GTM Playbook v2 — Content Review",
    dept: "Torina / Polish",
    status: "failed",
    duration: "1m 2s",
    timestamp: "11:30",
    steps: [
      { label: "Load document", status: "success", dur: "4s", output: ["GTM-Playbook-v2.md — 3,182 words loaded"] },
      { label: "Brand consistency check", status: "success", dur: "18s", output: ["12 brand terms verified", "Tone: ✓ matches brand voice"] },
      { label: "Factual verification", status: "failed", dur: "40s", output: ["Checking 24 claims against knowledge base...", "ERROR: Competitor data mismatch on slide 7", "Claim: 'Market share 34%' — source: outdated (Mar 2025)", "✗ Verification failed — return to Quill for revision"] },
      { label: "Submit for approval", status: "pending", dur: "—", output: [] },
    ]
  },
];

const stepStatusColor = {
  success: "text-emerald-400",
  failed: "text-red-400",
  running: "text-cyan-400",
  pending: "text-white/20",
};
const stepStatusIcon = {
  success: "✓",
  failed: "✗",
  running: "▶",
  pending: "·",
};
const jobStatusVariant = { success: "active", failed: "critical", running: "info", pending: "idle" };

function BuildJobCard({ job, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-white/[0.05] hover:border-white/[0.09] glass-card"
      }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[11px] font-semibold text-white/70 leading-snug">{job.name}</p>
        <StatusBadge variant={jobStatusVariant[job.status]} dot={job.status === "running"}>
          {job.status}
        </StatusBadge>
      </div>
      <div className="flex items-center gap-2 text-[8px] text-white/25 font-mono">
        <span className="border border-white/[0.08] px-1.5 py-0.5 rounded">{job.id}</span>
        <span>{job.dept}</span>
        <span className="ml-auto">{job.timestamp}</span>
        <span>{job.duration}</span>
      </div>
    </button>
  );
}

function StepOutput({ step, index, autoOpen }) {
  const [open, setOpen] = useState(autoOpen || step.status === "running");
  return (
    <div className="border-l-2 pl-3 mb-3"
      style={{ borderColor: step.status === "success" ? "rgba(32,200,120,0.25)" : step.status === "failed" ? "rgba(239,68,68,0.25)" : step.status === "running" ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left mb-1 group">
        <span className={`text-[10px] font-bold font-mono w-4 shrink-0 ${stepStatusColor[step.status]}`}>
          {step.status === "running"
            ? <span className="inline-block animate-spin text-[8px]">◌</span>
            : stepStatusIcon[step.status]
          }
        </span>
        <span className={`text-[11px] font-medium ${step.status === "pending" ? "text-white/25" : "text-white/60"}`}>
          {index + 1}. {step.label}
        </span>
        {step.dur !== "—" && (
          <span className="text-[8px] text-white/15 font-mono ml-auto">{step.dur}</span>
        )}
        {step.output.length > 0 && (
          <ChevronRight className={`w-3 h-3 text-white/15 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      <AnimatePresence>
        {open && step.output.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="bg-black/30 rounded-lg p-2.5 mb-1 border border-white/[0.04]">
              {step.output.map((line, i) => (
                <p key={i} className={`text-[9px] font-mono leading-relaxed ${
                  line.startsWith("✓") || line.startsWith("PASS") ? "text-emerald-400/80" :
                  line.startsWith("✗") || line.startsWith("ERROR") || line.startsWith("FAIL") ? "text-red-400/80" :
                  line.startsWith("WARNING") ? "text-amber-400/80" :
                  "text-white/35"
                }`}>{line}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BuildLogs() {
  const [selected, setSelected] = useState(BUILD_JOBS[0]);
  const [tick, setTick] = useState(0);

  // Simulate live output ticking for running job
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 h-[calc(100vh-160px)] min-h-[500px]">
      {/* Job list */}
      <div className="w-64 shrink-0 space-y-1.5 overflow-y-auto pr-1">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-3.5 h-3.5 text-emerald-400/60" />
          <p className="text-[9px] text-white/25 uppercase tracking-widest font-mono">Build Executions</p>
          <span className="ml-auto text-[8px] text-white/15 font-mono">{BUILD_JOBS.length} runs</span>
        </div>
        {BUILD_JOBS.map(job => (
          <BuildJobCard key={job.id} job={job} selected={selected?.id === job.id} onClick={() => setSelected(job)} />
        ))}
      </div>

      {/* Log viewer */}
      <div className="flex-1 flex flex-col glass-card border border-white/[0.06] rounded-xl overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: "rgba(32,200,120,0.07)", background: "rgba(0,0,0,0.25)" }}>
              <Terminal className="w-3.5 h-3.5 text-emerald-400/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/65 truncate">{selected.name}</p>
                <div className="flex items-center gap-2 text-[8px] text-white/20 font-mono mt-0.5">
                  <span>{selected.id}</span>
                  <span>·</span>
                  <span>{selected.dept}</span>
                  <span>·</span>
                  <span>{selected.timestamp} today</span>
                  <span>·</span>
                  <span>{selected.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusBadge variant={jobStatusVariant[selected.status]} dot={selected.status === "running"}>
                  {selected.status}
                </StatusBadge>
                <button className="p-1.5 rounded hover:bg-white/[0.06] text-white/15 transition-colors ml-1">
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Steps summary bar */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {selected.steps.map((s, i) => (
                  <div key={i} className={`h-1 flex-1 min-w-4 rounded-full transition-all ${
                    s.status === "success" ? "bg-emerald-500/50" :
                    s.status === "failed" ? "bg-red-500/50" :
                    s.status === "running" ? "bg-cyan-500/50 animate-pulse" :
                    "bg-white/[0.07]"
                  }`} />
                ))}
              </div>
              {selected.steps.map((step, i) => (
                <StepOutput key={`${selected.id}-${i}`} step={step} index={i} autoOpen={selected.status === "failed" && step.status === "failed"} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-white/15 font-mono">Select a build job</p>
          </div>
        )}
      </div>
    </div>
  );
}