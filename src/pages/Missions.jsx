import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import TruthBadge from "../components/mission-control/TruthBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { fetchJson } from "../lib/jsonFetch";
import { arrayify, countBy, normalizeTruth } from "../lib/mcTruth";
import { ChevronRight, LayoutGrid, List, Layers, Target, ListTodo, Clock3, AlertTriangle, CheckCircle2, Workflow } from "lucide-react";

const jobStatus = (value) => String(value || "").toLowerCase();
const activeStatuses = new Set(["queued", "running", "active", "hold", "blocked", "in_progress", "scoped"]);
const blockedStatuses = new Set(["hold", "blocked", "cancelled", "rejected"]);
const completeStatuses = new Set(["complete", "completed", "done", "success"]);

const statusText = {
  live: "live",
  "registry-backed": "registry-backed",
  seeded: "seeded",
  unavailable: "unavailable",
};

function SourceRow({ source, children }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TruthBadge source={source} />
      {children}
    </div>
  );
}

function SectionTitle({ title, source, note }) {
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

function statCard({ label, value, source, hint }) {
  return { label, value, source, hint };
}

export default function Missions() {
  const [jobs, setJobs] = useState([]);
  const [workflows, setWorkflows] = useState({ departments: [] });
  const [runtime, setRuntime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("board");
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [jobData, workflowData, runtimeData] = await Promise.all([
          fetchJson("/api/jobs", { signal: controller.signal }),
          fetchJson("/api/departments/workflows", { signal: controller.signal }),
          fetchJson("/api/runtime", { signal: controller.signal }),
        ]);
        setJobs(arrayify(jobData));
        setWorkflows(workflowData || { departments: [] });
        setRuntime(runtimeData || null);
        setSelectedDept((workflowData?.departments || []).find((dept) => !dept.demoOnly) || (workflowData?.departments || [])[0] || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to load mission queue");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const liveQueue = useMemo(() => jobs.filter((job) => activeStatuses.has(jobStatus(job.status))), [jobs]);
  const blockedQueue = useMemo(() => jobs.filter((job) => blockedStatuses.has(jobStatus(job.status))), [jobs]);
  const completedQueue = useMemo(() => jobs.filter((job) => completeStatuses.has(jobStatus(job.status))), [jobs]);
  const reviewQueue = useMemo(() => jobs.filter((job) => ["scoped", "hold", "blocked", "queued", "review", "in_review"].includes(jobStatus(job.status)) || ["exec_qa", "perry_qa", "nettie_qa", "approval"].includes(jobStatus(job.stage))), [jobs]);
  const topJobs = useMemo(() => [...jobs].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))).slice(0, 10), [jobs]);

  const summaryCards = [
    statCard({ label: "Live work packets", value: liveQueue.length, source: "live", hint: "Queue items currently in motion" }),
    statCard({ label: "Blocked / returned", value: blockedQueue.length, source: "live", hint: "Packets waiting on review or unblock" }),
    statCard({ label: "Completed archive", value: completedQueue.length, source: "live", hint: "Finished packets and wrapped work" }),
    statCard({ label: "Workflow registry", value: arrayify(workflows?.departments).length, source: "registry-backed", hint: `${workflows?.summary?.realDepartments ?? 0} real / ${workflows?.summary?.demoDepartments ?? 0} demo` }),
  ];

  const queueSource = loading ? "unavailable" : error ? "unavailable" : "live";
  const registrySource = arrayify(workflows?.departments).some((dept) => dept.demoOnly) ? "registry-backed" : "live";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Missions</h1>
          <p className="text-[11px] text-white/30">Live work queue surface — every packet is source-labeled and routed by truth</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button onClick={() => setView("board")} className={`p-1.5 rounded-md transition-colors ${view === "board" ? "bg-white/[0.08] text-white/70" : "text-white/25"}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white/[0.08] text-white/70" : "text-white/25"}`}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
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

      {(error || loading) && (
        <GlassCard className="p-3">
          <SourceRow source={queueSource}>
            <p className="text-[11px] text-white/35">{error ? error : "Loading live mission queue…"}</p>
          </SourceRow>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <GlassCard className="p-4">
          <SectionTitle title="Live mission queue" source="live" note="Current packets from /api/jobs with explicit source labeling." />
          {view === "board" ? (
            <div className="space-y-2">
              {topJobs.map((job) => {
                const source = normalizeTruth(job.sourceType || (job.worker ? "live" : "registry-backed"));
                return (
                  <div key={job.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[12px] text-white/70 font-medium truncate">{job.title}</p>
                          <TruthBadge source={source} />
                        </div>
                        <p className="text-[10px] text-white/28 truncate">{job.id} · owner {job.owner ?? "unassigned"} · priority {job.priority ?? "—"} · stage {job.stage ?? "—"}</p>
                      </div>
                      <StageBadge stage={job.stage || "SCOPED"} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-white/26">
                      <span className="px-2 py-0.5 rounded bg-white/[0.03]">status {job.status ?? "unknown"}</span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.03]">updated {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "unavailable"}</span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.03]">route {job.routeStatus ?? "unavailable"}</span>
                    </div>
                  </div>
                );
              })}
              {!topJobs.length && <p className="text-[11px] text-white/25">No active work packets.</p>}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.04]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/[0.02] text-white/30 uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Packet</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {topJobs.map((job) => {
                    const source = normalizeTruth(job.sourceType || (job.worker ? "live" : "registry-backed"));
                    return (
                      <tr key={job.id} className="border-t border-white/[0.04] align-top">
                        <td className="px-3 py-2"><TruthBadge source={source} /></td>
                        <td className="px-3 py-2 text-white/65">{job.title}<div className="text-[9px] text-white/22 mt-1">{job.id}</div></td>
                        <td className="px-3 py-2 text-white/45">{job.owner ?? "unassigned"}</td>
                        <td className="px-3 py-2 text-white/45">{job.status ?? "unknown"}</td>
                        <td className="px-3 py-2 text-white/30">{job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "unavailable"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4">
            <SectionTitle title="Workflow travel view" source={registrySource} note="Department registry view with workflow templates and next recommended automation." />
            <div className="space-y-3">
              {(selectedDept ? [selectedDept] : arrayify(workflows?.departments).slice(0, 1)).map((dept) => (
                <div key={dept.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[13px] text-white/70 font-medium">{dept.name}</p>
                      <p className="text-[10px] text-white/28">{dept.title}</p>
                    </div>
                    <TruthBadge source={dept.demoOnly ? "seeded" : (dept.sourceTruth || "registry-backed")} />
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed mb-3">{dept.mission}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-white/24 mb-3">
                    <span className="px-2 py-1 rounded bg-white/[0.03]">workflow templates {dept.workflowTemplates?.length ?? 0}</span>
                    <span className="px-2 py-1 rounded bg-white/[0.03]">active queue {dept.activeQueueCount ?? 0}</span>
                    <span className="px-2 py-1 rounded bg-white/[0.03]">blocked {dept.blockedItems ?? 0}</span>
                    <span className="px-2 py-1 rounded bg-white/[0.03]">last execution {dept.lastExecution ? new Date(dept.lastExecution).toLocaleString() : "unavailable"}</span>
                  </div>
                  <p className="text-[10px] text-white/28 mb-2">next recommended automation</p>
                  <p className="text-[11px] text-white/55 leading-relaxed">{dept.nextRecommendedAutomation ?? "Unavailable"}</p>
                  <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <Workflow className="w-3.5 h-3.5 text-white/25" />
                      <span className="text-[10px] text-white/25 uppercase tracking-wider">n8n-style flow</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/30 overflow-x-auto pb-1">
                      {(dept.workflowTemplates?.[0]?.nodeChain || []).map((node, index) => (
                        <span key={node.id} className="inline-flex items-center gap-2 shrink-0">
                          <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.05]">{node.label}</span>
                          {index < (dept.workflowTemplates?.[0]?.nodeChain?.length || 0) - 1 && <ChevronRight className="w-3 h-3 text-white/15" />}
                        </span>
                      ))}
                      {!dept.workflowTemplates?.[0]?.nodeChain?.length && <span className="text-white/20">No live workflow records yet.</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {arrayify(workflows?.departments).map((dept) => (
                  <button key={dept.id} onClick={() => setSelectedDept(dept)} className={`px-2.5 py-1.5 rounded-lg text-[10px] transition-colors border ${selectedDept?.id === dept.id ? "bg-white/[0.08] text-white/70 border-white/[0.10]" : "bg-white/[0.03] text-white/25 border-white/[0.05] hover:text-white/50"}`}>
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Blocked and completed work" source="live" note="Live queue splits keep reviewable packets separate from wrapped work." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Blocked / returned</p>
                  <TruthBadge source="live" />
                </div>
                <div className="space-y-2">
                  {blockedQueue.slice(0, 4).map((job) => (
                    <div key={job.id} className="text-[10px] text-white/40">
                      <p className="text-white/60">{job.title}</p>
                      <p className="text-white/22">{job.status} · {job.nextAction || "Needs review"}</p>
                    </div>
                  ))}
                  {!blockedQueue.length && <p className="text-[11px] text-white/25">No blocked work packets.</p>}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Completed archive</p>
                  <TruthBadge source="live" />
                </div>
                <div className="space-y-2">
                  {completedQueue.slice(0, 4).map((job) => (
                    <div key={job.id} className="text-[10px] text-white/40">
                      <p className="text-white/60">{job.title}</p>
                      <p className="text-white/22">{job.status} · {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : "unavailable"}</p>
                    </div>
                  ))}
                  {!completedQueue.length && <p className="text-[11px] text-white/25">No completed work packets.</p>}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-4">
        <SectionTitle title="Mission travel note" source="registry-backed" note="The registry is the source of truth for department templates; live jobs remain the source of truth for packet state." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-white/35">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><Target className="w-4 h-4 text-white/20 mb-2" /><p>Live queue: {liveQueue.length} packets in motion.</p></div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><ListTodo className="w-4 h-4 text-white/20 mb-2" /><p>Review inbox: {reviewQueue.length} packets require gate attention.</p></div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><Clock3 className="w-4 h-4 text-white/20 mb-2" /><p>Runtime health: {runtime?.overallHealth || "unavailable"} · confidence {runtime?.operationalConfidence?.label || "unknown"}</p></div>
        </div>
      </GlassCard>
    </div>
  );
}
