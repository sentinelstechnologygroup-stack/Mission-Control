import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { CheckCircle, XCircle, RotateCcw, Eye, AlertTriangle, Layers, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const columns = [
  {
    id: "EXEC_QA", label: "Exec QA", variant: "info",
    items: [
      {
        title: "Security Audit Report", origin: "Mission: Security Audit v2", originType: "mission",
        owner: "Within Core", stage: "EXEC_QA", risk: "low",
        notes: "Awaiting exec sign-off on compliance section. All critical items resolved.",
      },
      {
        title: "Market Trends Report Q1", origin: "Task: Index & Synthesize", originType: "task",
        owner: "Ivy", stage: "EXEC_QA", risk: "medium",
        notes: "Data validation needed for Q1 numbers. 2 sources flagged as outdated.",
      },
    ],
  },
  {
    id: "PERRY_QA", label: "Perry QA", variant: "review",
    items: [
      {
        title: "Demo.ai Deployment Package", origin: "Mission: Demo.ai Platform", originType: "mission",
        owner: "Perry", stage: "PERRY_QA", risk: "high",
        notes: "Final pre-production build. Auth + API changes. Performance test passing. Awaiting Perry code review.",
      },
    ],
  },
  {
    id: "NETTIE_QA", label: "Nettie QA", variant: "review",
    items: [
      {
        title: "Growth Strategy Deck", origin: "Mission: Q2 GTM Strategy", originType: "mission",
        owner: "Sam", stage: "NETTIE_QA", risk: "low",
        notes: "Nettie reviewing positioning alignment with brand doctrine.",
      },
      {
        title: "MeeshgCat Launch Copy", origin: "Content: MeeshgCat Launch", originType: "content",
        owner: "Sam", stage: "NETTIE_QA", risk: "medium",
        notes: "Tone audit against brand voice guidelines in progress.",
      },
      {
        title: "AI Workforce Thread", origin: "Content: Social Post", originType: "content",
        owner: "Sam", stage: "NETTIE_QA", risk: "low",
        notes: "Scheduled for Tue 9AM. Nettie reviewing messaging alignment.",
      },
    ],
  },
  {
    id: "PATRICK", label: "Patrick Approval", variant: "critical",
    items: [
      {
        title: "Demo.ai Website Launch", origin: "Mission: Demo.ai Platform", originType: "mission",
        owner: "Perry", stage: "APPROVAL", risk: "high",
        notes: "Production deployment ready. All QA gates passed. Requires Patrick final sign-off to go live.",
      },
      {
        title: "Q2 Budget Allocation", origin: "Internal: Finance", originType: "task",
        owner: "Nettie", stage: "APPROVAL", risk: "medium",
        notes: "Department budgets for April–June. Cost optimizations included. Net savings of $840/mo projected.",
      },
    ],
  },
  {
    id: "RETURNED", label: "Returned / Rework", variant: "warning",
    items: [
      {
        title: "Newsletter Copy v1", origin: "Mission: GTM Q2", originType: "content",
        owner: "Sam", stage: "NETTIE_QA", risk: "low",
        notes: "Returned by Nettie — tone doesn't match brand voice guidelines. Revise CTA and opening hook.",
      },
    ],
  },
];

const riskColors = { low: "active", medium: "warning", high: "critical" };
const originTypeIcon = { mission: "🎯", task: "⚡", content: "✍️" };

export default function Approvals() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Approvals</h1>
          <p className="text-[11px] text-white/30">QA gates and release bottleneck — nothing ships without passing all stages</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-amber-400/60">
            {columns.reduce((acc, c) => acc + c.items.length, 0)} items pending
          </span>
        </div>
      </div>

      {/* Flow summary */}
      <div className="flex items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4 overflow-x-auto">
        <Layers className="w-3.5 h-3.5 text-white/20 shrink-0" />
        <span className="text-[9px] text-white/20 shrink-0">All work flows through:</span>
        {["EXEC_QA", "PERRY_QA", "NETTIE_QA", "APPROVAL"].map((s, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <StageBadge stage={s} />
            {i < 3 && <span className="text-[10px] text-white/10">→</span>}
          </div>
        ))}
        <span className="text-[9px] text-white/15 ml-2">Nothing ships without Patrick approval.</span>
      </div>

      {/* Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-5">
        {columns.map((col, ci) => (
          <div key={col.id} className="min-w-[260px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
            <div className="flex items-center gap-2 mb-3 px-1">
              <StatusBadge variant={col.variant} dot={true}>{col.label}</StatusBadge>
              <span className="text-[9px] text-white/20 font-mono">{col.items.length}</span>
            </div>
            <div className="space-y-2">
              {col.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.05 + i * 0.03 }}
                >
                  <GlassCard className="p-3" hover>
                    {/* Origin */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[11px]">{originTypeIcon[item.originType]}</span>
                      <span className="text-[9px] text-white/20 truncate">{item.origin}</span>
                    </div>

                    {/* Title */}
                    <p className="text-[11px] text-white/65 font-semibold leading-tight mb-1.5">{item.title}</p>

                    {/* Meta */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[9px] text-white/25">{item.owner}</span>
                      <span className="text-[9px] text-white/10">·</span>
                      <StageBadge stage={item.stage} />
                      <StatusBadge variant={riskColors[item.risk]} dot={true} className="ml-auto">{item.risk}</StatusBadge>
                    </div>

                    {/* Notes */}
                    <p className="text-[10px] text-white/28 leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>{item.notes}</p>

                    {/* Decision controls */}
                    <div className="flex items-center gap-1 pt-2 border-t border-white/[0.04]">
                      {col.id !== "RETURNED" && (
                        <>
                          <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-medium hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle className="w-3 h-3" />
                            {col.id === "PATRICK" ? "Approve ✓" : "Pass"}
                          </button>
                          <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[9px] font-medium hover:bg-red-500/20 transition-colors">
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </>
                      )}
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[9px] font-medium hover:bg-amber-500/20 transition-colors">
                        <RotateCcw className="w-3 h-3" />
                        Return
                      </button>
                      {col.id === "RETURNED" && (
                        <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-medium hover:bg-blue-500/20 transition-colors">
                          <ArrowUpRight className="w-3 h-3" />
                          Escalate
                        </button>
                      )}
                      <button className="p-1 rounded-lg hover:bg-white/[0.06] text-white/20 transition-colors ml-auto">
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}