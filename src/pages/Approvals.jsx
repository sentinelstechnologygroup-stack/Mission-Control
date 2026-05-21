import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import TruthBadge from "../components/mission-control/TruthBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { fetchJson } from "../lib/jsonFetch";
import { arrayify, normalizeTruth } from "../lib/mcTruth";
import { AlertTriangle, ArrowUpRight, CheckCircle2, RotateCcw, ShieldCheck, ShieldAlert, Eye, Layers } from "lucide-react";

const reviewStages = new Set(["exec_qa", "perry_qa", "nettie_qa", "approval"]);
const reviewStatuses = new Set(["queued", "running", "active", "hold", "blocked", "in_progress", "scoped", "review", "rework", "cancelled"]);

function sectionLabel(title, source, note) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</h2>
        {note ? <p className="text-[10px] text-white/22 mt-1">{note}</p> : null}
      </div>
      <TruthBadge source={source} />
    </div>
  );
}

function reviewBucket(job) {
  const stage = String(job.stage || "").toLowerCase();
  const status = String(job.status || "").toLowerCase();
  if (stage === "approval" || status === "hold") return "Patrick approval";
  if (stage === "perry_qa" || status === "blocked") return "Perry QA";
  if (stage === "nettie_qa") return "Nettie QA";
  if (stage === "exec_qa") return "Exec QA";
  return "Review inbox";
}

export default function Approvals() {
  const [jobs, setJobs] = useState([]);
  const [workflowData, setWorkflowData] = useState({ departments: [] });
  const [securityDept, setSecurityDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [jobData, workflowRegistry, securityData] = await Promise.all([
          fetchJson("/api/jobs", { signal: controller.signal }),
          fetchJson("/api/departments/workflows", { signal: controller.signal }),
          fetchJson("/api/departments/security", { signal: controller.signal }),
        ]);
        setJobs(arrayify(jobData));
        setWorkflowData(workflowRegistry || { departments: [] });
        setSecurityDept(securityData || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to load approvals inbox");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const reviewInbox = useMemo(() => jobs.filter((job) => reviewStatuses.has(String(job.status || "").toLowerCase()) || reviewStages.has(String(job.stage || "").toLowerCase())), [jobs]);
  const blockedItems = useMemo(() => jobs.filter((job) => ["hold", "blocked", "rejected", "cancelled"].includes(String(job.status || "").toLowerCase())), [jobs]);
  const escalations = useMemo(() => jobs.filter((job) => ["approval", "exec_qa", "perry_qa"].includes(String(job.stage || "").toLowerCase()) || String(job.routeStatus || "").toLowerCase().includes("review")), [jobs]);
  const returned = useMemo(() => jobs.filter((job) => ["rework", "returned"].includes(String(job.status || "").toLowerCase()) || String(job.nextAction || "").toLowerCase().includes("return")), [jobs]);

  const securityGateCount = arrayify(securityDept?.audit?.securityGates || securityDept?.qaGates || []).length || arrayify(workflowData?.departments).find((d) => d.id === "perry")?.qaGates?.length || 0;
  const approvalsSource = loading ? "unavailable" : error ? "unavailable" : "live";

  const queueColumns = [
    { id: "EXEC_QA", label: "Exec QA", source: "live", items: reviewInbox.filter((job) => String(job.stage || "").toLowerCase() === "exec_qa").slice(0, 6) },
    { id: "PERRY_QA", label: "Perry QA", source: "live", items: reviewInbox.filter((job) => String(job.stage || "").toLowerCase() === "perry_qa").slice(0, 6) },
    { id: "NETTIE_QA", label: "Nettie QA", source: "live", items: reviewInbox.filter((job) => String(job.stage || "").toLowerCase() === "nettie_qa").slice(0, 6) },
    { id: "APPROVAL", label: "Patrick approval", source: "live", items: reviewInbox.filter((job) => String(job.stage || "").toLowerCase() === "approval" || String(job.status || "").toLowerCase() === "hold").slice(0, 6) },
    { id: "RETURNED", label: "Returned / rework", source: "seeded", items: returned.slice(0, 6) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Approvals</h1>
          <p className="text-[11px] text-white/30">Executive review and QA/security gate inbox — source-labeled by packet truth</p>
        </div>
        <TruthBadge source={approvalsSource} />
      </div>

      {(loading || error) && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TruthBadge source={approvalsSource} />
            <p className="text-[11px] text-white/35">{error ? error : "Loading live approvals inbox…"}</p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Review inbox", value: reviewInbox.length, source: "live", hint: "Packets waiting on QA or approval" },
          { label: "Blocked / escalated", value: blockedItems.length, source: "live", hint: "Held until the next gate clears" },
          { label: "Returned / rework", value: returned.length, source: "live", hint: "Items sent back for correction" },
          { label: "Security gates", value: securityGateCount, source: "registry-backed", hint: "Perry-owned gates from the registry" },
        ].map((card) => (
          <GlassCard key={card.label} className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] text-white/25 uppercase tracking-wider">{card.label}</p>
              <TruthBadge source={card.source} />
            </div>
            <p className="text-[20px] font-semibold text-white/75 mb-1">{card.value}</p>
            <p className="text-[10px] text-white/30">{card.hint}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        {sectionLabel("Gate ladder", "registry-backed", "The live queue is routed through visible QA / approval stages.")}
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-white/28">
          {["EXEC_QA", "PERRY_QA", "NETTIE_QA", "APPROVAL"].map((stage, index) => (
            <span key={stage} className="inline-flex items-center gap-2">
              <StageBadge stage={stage} />
              {index < 3 ? <span className="text-white/15">→</span> : null}
            </span>
          ))}
          <span className="text-white/20">No work ships without explicit approval gates.</span>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <GlassCard className="p-4">
          {sectionLabel("Executive review inbox", "live", "Live review items pulled from /api/jobs and grouped by stage.")}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {queueColumns.slice(0, 4).map((column) => (
              <div key={column.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">{column.label}</p>
                  <TruthBadge source={column.source} />
                </div>
                <div className="space-y-2">
                  {column.items.map((job) => (
                    <div key={job.id} className="p-2.5 rounded-xl bg-black/10 border border-white/[0.04]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] text-white/65 font-medium leading-snug">{job.title}</p>
                        <StageBadge stage={job.stage || "SCOPED"} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[9px] text-white/24">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">{job.id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">owner {job.owner || "unassigned"}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">status {job.status || "unknown"}</span>
                      </div>
                    </div>
                  ))}
                  {!column.items.length && <p className="text-[11px] text-white/25">No live review items in this stage.</p>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4">
            {sectionLabel("Security gate inbox", "registry-backed", "Perry review and compliance gates come from the department registry.")}
            <div className="space-y-2">
              {(securityDept?.activeJobs || []).slice(0, 5).map((job) => (
                <div key={job.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-[11px] text-white/65 font-medium">{job.task}</p>
                      <p className="text-[9px] text-white/22">{job.id} · owner {job.owner || "Perry"}</p>
                    </div>
                    <TruthBadge source={normalizeTruth(job.source || "live")} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[9px] text-white/24">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">route {job.routeStatus || "unavailable"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">priority {job.priority || "—"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">stage {job.stage || "—"}</span>
                  </div>
                </div>
              ))}
              {!securityDept?.activeJobs?.length && <p className="text-[11px] text-white/25">No live security queue items.</p>}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            {sectionLabel("Returned / rework", "seeded", "Returned items are preserved as a visible rework lane, not hidden.")}
            <div className="space-y-2">
              {queueColumns.find((c) => c.id === "RETURNED")?.items.map((job) => (
                <div key={job.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[11px] text-white/65 font-medium">{job.title}</p>
                    <TruthBadge source="seeded" />
                  </div>
                  <p className="text-[9px] text-white/22">{reviewBucket(job)} · {job.nextAction || "Return for correction"}</p>
                </div>
              ))}
              {!queueColumns.find((c) => c.id === "RETURNED")?.items.length && <p className="text-[11px] text-white/25">No returned work packets.</p>}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-4">
        {sectionLabel("Approval matrix", "registry-backed", "Live stages plus seeded rework lane keep the gate surface honest.")}
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {queueColumns.map((col) => (
            <div key={col.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/25 uppercase tracking-wider">{col.label}</p>
                <TruthBadge source={col.source} />
              </div>
              <p className="text-[20px] text-white/70 font-semibold">{col.items.length}</p>
              <p className="text-[10px] text-white/28 mt-1">{col.id === "RETURNED" ? "Seeded rework lane" : "Live review queue"}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        {sectionLabel("Escalation routing", "live", "These items need attention because their stage or status still blocks release.")}
        <div className="space-y-2">
          {escalations.slice(0, 8).map((job) => (
            <div key={job.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/65 font-medium">{job.title}</p>
                <p className="text-[9px] text-white/22">{job.id} · {reviewBucket(job)} · {job.nextAction || "Needs a decision"}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TruthBadge source="live" />
                <StageBadge stage={job.stage || "SCOPED"} />
              </div>
            </div>
          ))}
          {!escalations.length && <p className="text-[11px] text-white/25">No escalations in the approval inbox.</p>}
        </div>
      </GlassCard>
    </div>
  );
}
