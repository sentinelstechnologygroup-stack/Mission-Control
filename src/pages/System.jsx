import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import BurnDashboard from "../components/mission-control/BurnDashboard";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { api } from "@/lib/api";
import { LinkButton, MetricGrid, PageHeader, SectionCard, SimpleTable, StatusPill } from "../components/mission-control/LiveDataViews";

const tabs = [
  { id: "overview", label: "Command" },
  { id: "executors", label: "Executors" },
  { id: "skills", label: "Skills / Runbooks" },
  { id: "logs", label: "Logs" },
  { id: "state", label: "State" },
  { id: "settings", label: "Settings" },
];

const SKILLS = [
  { id: "missioncontrol-safe-local-transformation-policy", owner: "Perry / Van", loaded: true, state: "loaded", migration: "native", statusNote: "Session-loaded and visible in Mission Control." },
  { id: "mc-command-bridge", owner: "Nettie", loaded: true, state: "loaded", migration: "native", statusNote: "Command routing and execution truth are visible in-app." },
  { id: "missioncontrol-verification-checklist", owner: "Perry", loaded: true, state: "loaded", migration: "native", statusNote: "Verification flow is available for local checks." },
  { id: "missioncontrol-base44-runbook-rules", owner: "Van", loaded: false, state: "missing", migration: "pending", statusNote: "Should be surfaced as an explicit operator runbook." },
  { id: "missioncontrol-governance-layer", owner: "Nettie", loaded: false, state: "missing", migration: "pending", statusNote: "Still mostly backend-adjacent and should be visible in the UI." },
  { id: "missioncontrol-safe-local-policy-core", owner: "Perry", loaded: false, state: "missing", migration: "pending", statusNote: "Needs a visible operator surface, not just policy internals." },
  { id: "missioncontrol-irl-registration", owner: "Nettie", loaded: false, state: "missing", migration: "pending", statusNote: "IRL registration should be obvious to operators." },
  { id: "gptCodexSubscriptionAdapter", owner: "Van", loaded: false, state: "scaffold", migration: "scaffold only", statusNote: "Visible adapter surface exists; live subscription route still needs a verified exercise." },
];

function statusTone(status = "idle") {
  const value = String(status).toLowerCase();
  if (["running", "active", "live", "healthy", "ready", "available", "loaded", "success"].includes(value)) return "active";
  if (["blocked", "failed", "error", "critical", "missing", "unavailable", "auth failure", "scaffold"].includes(value)) return "critical";
  if (["queued", "pending", "cooldown", "warning", "review", "cooling down"].includes(value)) return "warning";
  return "idle";
}

function MiniStat({ label, value, sub }) {
  return (
    <GlassCard className="py-3">
      <p className="text-[9px] uppercase tracking-wider text-white/25">{label}</p>
      <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{value ?? "—"}</p>
      {sub ? <p className="mt-1 text-[9px] text-white/25">{sub}</p> : null}
    </GlassCard>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] transition-colors ${active ? "border-white/20 bg-white/10 text-white/85" : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/60"}`}
    >
      {children}
    </button>
  );
}

function SkillRow({ item }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 md:grid-cols-[1.7fr_0.7fr_0.8fr_1fr] md:items-center">
      <div>
        <p className="text-[11px] font-semibold text-white/75">{item.id}</p>
        <p className="mt-1 text-[10px] text-white/28 leading-relaxed">{item.statusNote}</p>
      </div>
      <div className="text-[10px] text-white/45">Owner: {item.owner}</div>
      <div><StatusBadge variant={statusTone(item.state)}>{item.state}</StatusBadge></div>
      <div className="text-[10px] text-white/45">Migration: {item.migration}</div>
    </div>
  );
}

function ExecutorStat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[8px] uppercase tracking-wider text-white/22">{label}</p>
      <p className="mt-1 text-[11px] font-mono text-white/72">{value ?? "—"}</p>
      {sub ? <p className="mt-1 text-[9px] text-white/24">{sub}</p> : null}
    </div>
  );
}

export default function System() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: systemTruth } = useQuery({
    queryKey: ["system", "truth"],
    queryFn: api.system,
    refetchInterval: 10000,
  });

  const { data: runtimeHealth } = useQuery({
    queryKey: ["system", "runtime-health"],
    queryFn: api.runtimeHealth,
    refetchInterval: 10000,
  });

  const { data: runtimeAlerts = [] } = useQuery({
    queryKey: ["system", "runtime-alerts"],
    queryFn: api.runtimeAlerts,
    refetchInterval: 10000,
  });

  const { data: executorHealth } = useQuery({
    queryKey: ["system", "executor-health"],
    queryFn: api.executorsHealth,
    refetchInterval: 10000,
  });

  const { data: executorEvidence = {} } = useQuery({
    queryKey: ["system", "executor-evidence"],
    queryFn: api.executorEvidence,
    refetchInterval: 10000,
  });

  const { data: executorStatus, error: executorStatusError } = useQuery({
    queryKey: ["system", "executor-status"],
    queryFn: api.executorStatus,
    retry: false,
    refetchInterval: 10000,
  });

  const { data: queueSummary } = useQuery({
    queryKey: ["system", "queue-summary"],
    queryFn: api.queueSummary,
    refetchInterval: 10000,
  });

  const { data: jobsSummary } = useQuery({
    queryKey: ["system", "jobs-summary"],
    queryFn: api.jobsSummary,
    refetchInterval: 10000,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["system", "activity-recent"],
    queryFn: api.activityRecent,
    refetchInterval: 10000,
  });

  const { data: liveLogs = [] } = useQuery({
    queryKey: ["system", "logs"],
    queryFn: api.logs,
    refetchInterval: 10000,
  });

  const stopWorkerMutation = useMutation({
    mutationFn: (workerId) => api.stopWorker(workerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['costs'] });
    },
  });

  const executorMode = useMemo(() => {
    if (executorStatusError) return "auth failure / unavailable";
    if (executorStatus?.cooldown || executorHealth?.codexAuthStatus === "cooldown") return "cooldown";
    if (executorStatus?.available || executorHealth?.selectedExecutor || systemTruth?.system?.selectedExecutor) return "available";
    return "unavailable";
  }, [executorStatus, executorStatusError, executorHealth, systemTruth]);

  const renderedWorkers = Array.isArray(systemTruth?.workers) ? systemTruth.workers : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="System"
        subtitle="Operational command room for burn, executor truth, logs, state, and the MC-side skill/runbook surface."
        actions={<LinkButton to="/departments/van">Van office</LinkButton>}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</TabButton>)}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Overall health" value={runtimeHealth?.overallHealth || "—"} sub={runtimeHealth?.reconciliationWarnings?.length ? `${runtimeHealth.reconciliationWarnings.length} reconciliation warnings` : "Live"} />
              <MiniStat label="Queue pressure" value={`${queueSummary?.totalQueued ?? "—"} queued`} sub={`${queueSummary?.totalBlocked ?? "—"} blocked`} />
              <MiniStat label="Executor truth" value={executorMode} sub={executorHealth?.recommendation || executorStatusError?.message || "Ready state truth"} />
              <MiniStat label="Burn / approvals" value={`${jobsSummary?.totalCompleted ?? 0} complete`} sub={`${systemTruth?.counts?.approvals ?? 0} approvals`} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard title="Command center" subtitle="Visible operational storytelling for the system surface.">
                <BurnDashboard />
              </SectionCard>

              <SectionCard title="Executor lane" subtitle="Selected executor, fallback, cooldown, and adapter state are visible here.">
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <ExecutorStat label="Selected executor" value={systemTruth?.system?.selectedExecutor || executorHealth?.selectedExecutor || "—"} sub="Primary route" />
                    <ExecutorStat label="Fallback executor" value={systemTruth?.system?.fallbackExecutor || executorHealth?.fallbackExecutor || "—"} sub="Fallback route" />
                    <ExecutorStat label="Codex auth" value={executorHealth?.codexAuthStatus || "—"} sub={executorHealth?.codexAvailable ? executorHealth?.codexVersion : "Not available"} />
                    <ExecutorStat label="Hermes mode" value={systemTruth?.system?.hermesMode || executorHealth?.hermesMode || "—"} sub={executorHealth?.hermesAvailable ? "Present" : "Not present"} />
                  </div>
                  <GlassCard className="p-3">
                    <p className="text-[11px] font-semibold text-white/75">gptCodexSubscriptionAdapter</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {executorStatusError
                        ? `auth failure / unavailable · ${executorStatusError.message}`
                        : executorStatus
                          ? `available ${executorStatus.available ? "yes" : "no"} · executor ${executorStatus.executor || systemTruth?.system?.selectedExecutor || "codex"} · cooldown ${executorStatus.cooldown || "none"}`
                          : `scaffolded only · live browser verification still required`}
                    </p>
                  </GlassCard>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard title="Runtime execution feed" subtitle="Recent operational activity and feed truth.">
                <div className="space-y-2">
                  {recentActivity.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/72">{item.summary}</p>
                        <p className="text-[9px] text-white/24">{item.type} · {item.truthStatus || "LIVE"} · {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Latest alerts" subtitle="Visible signal pressure without burying it in metadata.">
                <div className="space-y-2">
                  {runtimeAlerts.slice(0, 3).map((alert, index) => (
                    <GlassCard key={`${alert.summary}-${index}`} className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-amber-300/80">{alert.severity || "info"}</p>
                      <p className="mt-1 text-[11px] text-white/70">{alert.summary}</p>
                      <p className="mt-1 text-[9px] text-white/25">{alert.recommendedAction}</p>
                    </GlassCard>
                  ))}
                </div>
              </SectionCard>
            </div>
          </motion.div>
        )}

        {activeTab === "executors" && (
          <motion.div key="executors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SectionCard title="gptCodexSubscriptionAdapter" subtitle="Visible adapter status for the subscription executor path.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="State" value={executorMode} sub="selected / unavailable / cooldown / auth failure" />
                <MiniStat label="Started at" value={executorEvidence?.tasks?.[0]?.timestamp || executorHealth?.checkedAt || "—"} sub="Most recent evidence timestamp" />
                <MiniStat label="Completed at" value={executorEvidence?.updatedAt || executorStatus?.completed_at || "—"} sub="Evidence / completion stamp" />
                <MiniStat label="Cooldown until" value={executorStatus?.cooldown || executorHealth?.recommendation || "—"} sub="Truthful cooldown signal" />
              </div>
            </SectionCard>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard title="Executor truth panel" subtitle="Readiness, auth, fallback, and local lane visibility.">
                <div className="grid gap-2 md:grid-cols-2">
                  <ExecutorStat label="Codex available" value={String(executorHealth?.codexAvailable ?? false)} sub={executorHealth?.codexVersion || "—"} />
                  <ExecutorStat label="Codex auth" value={executorHealth?.codexAuthStatus || "—"} sub="Bridge readiness" />
                  <ExecutorStat label="Hermes available" value={String(executorHealth?.hermesAvailable ?? false)} sub={executorHealth?.hermesMode || "—"} />
                  <ExecutorStat label="Local fallback" value={executorHealth?.localFallback || "—"} sub="Fallback continuity lane" />
                  <ExecutorStat label="Selected executor" value={executorStatus?.executor || systemTruth?.system?.selectedExecutor || "—"} sub="Primary route" />
                  <ExecutorStat label="Executor availability" value={executorStatus?.available ? "available" : "unavailable"} sub={executorStatusError ? "auth failure" : "Readiness truth"} />
                </div>
              </SectionCard>

              <SectionCard title="Execution evidence" subtitle="What the runtime has already recorded for the adapter path.">
                <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                  {Array.isArray(executorEvidence?.tasks) ? executorEvidence.tasks.slice(0, 8).map((task) => (
                    <GlassCard key={`${task.taskId}-${task.timestamp}`} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-white/75">{task.taskTitle}</p>
                        <StatusBadge variant={statusTone(task.status)}>{task.status || "queued"}</StatusBadge>
                      </div>
                      <p className="mt-1 text-[9px] text-white/28">Provider {task.executorProvider || "—"} · Model {task.executorModel || "—"}</p>
                      <p className="mt-1 text-[9px] text-white/25">Files changed: {(task.filesChanged || []).length} · Tests: {(task.testsRun || []).length} · GPT used: {String(task.gptUsed ?? false)}</p>
                    </GlassCard>
                  )) : <p className="text-[10px] text-white/25">No executor evidence returned.</p>}
                </div>
              </SectionCard>
            </div>
          </motion.div>
        )}

        {activeTab === "skills" && (
          <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SectionCard title="Skills / Runbooks surface" subtitle="Loaded, missing, scaffold, and migration states are visible on the screen.">
              <div className="space-y-2">
                {SKILLS.map((skill) => <SkillRow key={skill.id} item={skill} />)}
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SectionCard title="Logs" subtitle="Recent system log lines, kept visible for investor-demo context and QA review.">
              <SimpleTable
                columns={[
                  { key: "time", label: "Time" },
                  { key: "type", label: "Type", render: (row) => <StatusPill status={row.type} /> },
                  { key: "msg", label: "Message" },
                  { key: "dept", label: "Department" },
                ]}
                rows={liveLogs}
                empty="No log lines returned."
              />
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "state" && (
          <motion.div key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SectionCard title="State" subtitle="High-level runtime and worker state is visible here.">
              <MetricGrid
                items={[
                  { label: "Jobs", value: systemTruth?.counts?.jobs ?? "—", sub: "Total persisted jobs" },
                  { label: "Active jobs", value: systemTruth?.counts?.activeJobs ?? "—", sub: "Live work" },
                  { label: "Queued jobs", value: queueSummary?.totalQueued ?? "—", sub: "Awaiting execution" },
                  { label: "Blocked jobs", value: queueSummary?.totalBlocked ?? "—", sub: "Needs recovery" },
                ]}
              />
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <MiniStat label="Runtime health" value={runtimeHealth?.overallHealth || "—"} />
                <MiniStat label="Executor truth" value={runtimeHealth?.executorTruth || "—"} />
                <MiniStat label="Workers" value={renderedWorkers.length} />
              </div>
            </SectionCard>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SectionCard title="Settings" subtitle="Routing and model preferences are readable, not hidden.">
              <div className="grid gap-3 xl:grid-cols-3">
                <GlassCard className="p-3">
                  <p className="text-[11px] font-semibold text-white/75">Model routing</p>
                  <p className="mt-1 text-[10px] text-white/28">Selected executor: {systemTruth?.system?.selectedExecutor || "—"}</p>
                  <p className="mt-1 text-[10px] text-white/28">Fallback executor: {systemTruth?.system?.fallbackExecutor || "—"}</p>
                </GlassCard>
                <GlassCard className="p-3">
                  <p className="text-[11px] font-semibold text-white/75">Alerting</p>
                  <p className="mt-1 text-[10px] text-white/28">Queue: {queueSummary?.truthStatus || "LIVE"}</p>
                  <p className="mt-1 text-[10px] text-white/28">Runtime: {runtimeHealth?.overallHealth || "—"}</p>
                </GlassCard>
                <GlassCard className="p-3">
                  <p className="text-[11px] font-semibold text-white/75">Lifecycle</p>
                  <p className="mt-1 text-[10px] text-white/28">Codex: {executorHealth?.codexAuthStatus || "—"}</p>
                  <p className="mt-1 text-[10px] text-white/28">Hermes: {executorHealth?.hermesMode || "—"}</p>
                </GlassCard>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
