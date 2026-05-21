import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/mission-control/GlassCard";
import TruthBadge from "../components/mission-control/TruthBadge";
import StatusBadge from "../components/mission-control/StatusBadge";
import { fetchJson } from "../lib/jsonFetch";
import { arrayify } from "../lib/mcTruth";
import { CalendarDays, Clock3, Layers, Users, Workflow, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

const seededBlocks = [
  { time: "09:00", label: "Daily standup", owner: "Nettie", room: "Conference room", source: "seeded" },
  { time: "10:30", label: "Review checkpoint", owner: "Van", room: "Operations room", source: "seeded" },
  { time: "12:00", label: "Break / idle buffer", owner: "Open", room: "Break room", source: "seeded" },
  { time: "14:00", label: "Approval checkpoint", owner: "Perry", room: "Review room", source: "seeded" },
  { time: "16:30", label: "Wrap-up and handoff", owner: "Nettie", room: "Conference room", source: "seeded" },
];

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

export default function CalendarPage() {
  const [tab, setTab] = useState("checkpoints");
  const [jobs, setJobs] = useState([]);
  const [workflows, setWorkflows] = useState({ departments: [] });
  const [runtime, setRuntime] = useState(null);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [jobData, workflowData, runtimeData, systemData] = await Promise.all([
          fetchJson("/api/jobs", { signal: controller.signal }),
          fetchJson("/api/departments/workflows", { signal: controller.signal }),
          fetchJson("/api/runtime", { signal: controller.signal }),
          fetchJson("/api/system", { signal: controller.signal }),
        ]);
        setJobs(arrayify(jobData));
        setWorkflows(workflowData || { departments: [] });
        setRuntime(runtimeData || null);
        setSystem(systemData || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to load planner surface");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const checkpointItems = useMemo(() => [...jobs].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))).slice(0, 8), [jobs]);
  const plannerRows = arrayify(workflows?.departments).map((dept) => ({
    id: dept.id,
    title: dept.name,
    detail: dept.nextRecommendedAutomation || dept.mission || "Unavailable",
    source: dept.demoOnly ? "seeded" : (dept.sourceTruth || "registry-backed"),
    queue: dept.activeQueueCount ?? 0,
    blocked: dept.blockedItems ?? 0,
    templates: dept.workflowTemplates?.length ?? 0,
    lastExecution: dept.lastExecution,
  }));

  const liveCount = checkpointItems.length;
  const plannerCount = plannerRows.length;
  const currentHealth = runtime?.overallHealth || "unavailable";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Calendar</h1>
          <p className="text-[11px] text-white/30">Operational schedule, checkpoints, planner surface, conference rooms, and idle/break buffers</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {["checkpoints", "planner", "conference"].map((name) => (
            <button key={name} onClick={() => setTab(name)} className={`px-3 py-1.5 rounded-md text-[10px] font-medium capitalize transition-colors ${tab === name ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {(loading || error) && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TruthBadge source={error ? "unavailable" : "live"} />
            <p className="text-[11px] text-white/35">{error ? error : "Loading live schedule checkpoints…"}</p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Live checkpoints", value: liveCount, source: "live", hint: "Most recent packet or workflow updates" },
          { label: "Department planners", value: plannerCount, source: "registry-backed", hint: "Registry-backed office schedules" },
          { label: "Runtime health", value: currentHealth, source: "live", hint: runtime?.operationalConfidence ? `Confidence ${runtime.operationalConfidence.label}` : "Operational confidence unavailable" },
          { label: "System workers", value: system?.counts?.workers ?? 0, source: "live", hint: `Jobs ${system?.counts?.jobs ?? 0} · blocked ${system?.counts?.blockedJobs ?? 0}` },
        ].map((card) => (
          <GlassCard key={card.label} className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] text-white/25 uppercase tracking-wider">{card.label}</p>
              <TruthBadge source={card.source} />
            </div>
            <p className="text-[18px] font-semibold text-white/75 mb-1 break-all">{card.value}</p>
            <p className="text-[10px] text-white/30">{card.hint}</p>
          </GlassCard>
        ))}
      </div>

      {tab === "checkpoints" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-4">
          <GlassCard className="p-4">
            <SectionTitle title="Live checkpoint timeline" source="live" note="Sorted by the most recent update across the work queue." />
            <div className="space-y-2">
              {checkpointItems.map((job) => (
                <div key={job.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[11px] text-white/68 font-medium">{job.title}</p>
                      <p className="text-[9px] text-white/22">{job.id} · owner {job.owner || "unassigned"} · route {job.routeStatus || "unavailable"}</p>
                    </div>
                    <TruthBadge source="live" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[9px] text-white/24">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">status {job.status || "unknown"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">stage {job.stage || "SCOPED"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">updated {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "unavailable"}</span>
                  </div>
                </div>
              ))}
              {!checkpointItems.length && <p className="text-[11px] text-white/25">No live checkpoints available.</p>}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Checkpoint detail" source="live" note="Current runtime posture and the next schedule handoff." />
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock3 className="w-3.5 h-3.5 text-white/20" />
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Runtime posture</p>
                </div>
                <p className="text-[12px] text-white/65">{runtime?.overallHealth || "unavailable"}</p>
                <p className="text-[10px] text-white/28 mt-1">Operational confidence: {runtime?.operationalConfidence?.label || "unknown"}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Workflow className="w-3.5 h-3.5 text-white/20" />
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Next handoff</p>
                </div>
                <p className="text-[11px] text-white/60">Review the oldest queued packet and route it to the correct department floor.</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white/20" />
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Meeting room state</p>
                </div>
                <p className="text-[11px] text-white/55">Conference room is available, but the schedule only shows seeded blocks until live meetings are connected.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "planner" && (
        <GlassCard className="p-4">
          <SectionTitle title="Department planner grid" source="registry-backed" note="Each office exposes queue depth, templates, blocked work, and next recommended automation." />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {plannerRows.map((row) => (
              <div key={row.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[12px] text-white/70 font-medium">{row.title}</p>
                    <p className="text-[9px] text-white/22">templates {row.templates} · queue {row.queue} · blocked {row.blocked}</p>
                  </div>
                  <TruthBadge source={row.source} />
                </div>
                <p className="text-[10px] text-white/32 leading-relaxed mb-3">{row.detail}</p>
                <div className="flex items-center gap-2 flex-wrap text-[9px] text-white/24">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">last execution {row.lastExecution ? new Date(row.lastExecution).toLocaleString() : "unavailable"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">source {row.source}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {tab === "conference" && (
        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
          <GlassCard className="p-4">
            <SectionTitle title="Conference room blocks" source="seeded" note="These are explicit planning placeholders until live calendar feeds are wired." />
            <div className="space-y-2">
              {seededBlocks.map((block) => (
                <div key={`${block.time}-${block.label}`} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-[11px] text-white/65 font-medium">{block.label}</p>
                      <p className="text-[9px] text-white/22">{block.time} · {block.owner} · {block.room}</p>
                    </div>
                    <TruthBadge source={block.source} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Break / idle lanes" source="seeded" note="Idle state is explicitly shown so empty time does not look like missing data." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-white/25 uppercase tracking-wider">Agent break room</p><TruthBadge source="seeded" /></div>
                <p className="text-[11px] text-white/55">Idle agents return here when they have no active packet or handoff.</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-white/25 uppercase tracking-wider">Planner caution</p><TruthBadge source="registry-backed" /></div>
                <p className="text-[11px] text-white/55">Use live queue updates for operational scheduling; use seeded blocks only as placeholders.</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] sm:col-span-2">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-white/20" /><p className="text-[10px] text-white/25 uppercase tracking-wider">Source rule</p></div>
                <p className="text-[11px] text-white/55">Every visible block in this planner is tagged live, registry-backed, seeded, or unavailable. Nothing in this room pretends to be live unless it came from the API.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
