import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  CircleDot,
  Link2,
  Shield,
  Workflow,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";

import { api } from "@/lib/api";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import AgentDesk from "../components/departments/AgentDesk";
import WorkflowCanvas from "../components/departments/WorkflowCanvas";
import {
  KeyValueList,
  LinkButton,
  PageHeader,
  SectionCard,
  SimpleTable,
  StatusPill,
} from "../components/mission-control/LiveDataViews";

const COMMAND_LANE = [
  {
    label: "Executive command lane",
    icon: Sparkles,
    title: "Patrick → Nettie → Department head",
    detail: "Issues flow from command intake through routing, review, and approval before execution.",
  },
  {
    label: "AI executor status lane",
    icon: Bot,
    title: "Executor truth + cooldown + auth",
    detail: "Mission Control should expose the selected executor, fallback availability, and readiness truth visibly.",
  },
  {
    label: "Cross-department routing lines",
    icon: Link2,
    title: "Department handoffs",
    detail: "Routing lines show how work moves across Nettie, Van, Perry, Torina, Dana, Icky, Funboy, Rab, and Novella.",
  },
];

const SKILL_SURFACE = [
  { id: "missioncontrol-safe-local-transformation-policy", owner: "Perry / Van", loaded: true, migration: "Native in Mission Control", notes: "Safe local scan and parse behavior is already documented and available in-session." },
  { id: "mc-command-bridge", owner: "Nettie", loaded: true, migration: "Native in Mission Control", notes: "Command bridge routing and job ledger semantics are visible in the UI stack." },
  { id: "missioncontrol-verification-checklist", owner: "Perry", loaded: true, migration: "Native in Mission Control", notes: "Verification gate is available for local build and runtime checks." },
  { id: "missioncontrol-base44-runbook-rules", owner: "Van", loaded: false, migration: "Pending UI surfacing", notes: "Required runbook should be surfaced as a visible operational artifact." },
  { id: "missioncontrol-governance-layer", owner: "Nettie", loaded: false, migration: "Pending UI surfacing", notes: "Should be visible as a runbook, not hidden metadata." },
  { id: "missioncontrol-safe-local-policy-core", owner: "Perry", loaded: false, migration: "Pending UI surfacing", notes: "Policy core should be migrated into MC-facing guidance and checks." },
  { id: "missioncontrol-irl-registration", owner: "Nettie", loaded: false, migration: "Pending UI surfacing", notes: "IRL registration is not yet surfaced as an obvious operator surface." },
  { id: "missioncontrol-missing-gpt-codex-adapter", owner: "Van", loaded: false, migration: "Scaffold only", notes: "The GPT/Codex subscription adapter is not yet exercised live in the browser." },
];

const PRIMARY_DEPARTMENTS = ["nettie", "van", "perry", "torina", "dana", "icky", "funboy", "rab", "novella"];
const DEPARTMENT_ALIAS_LOOKUP = {
  technology: "van",
  tech: "van",
  media: "torina",
  security: "perry",
  finance: "dana",
  admin: "icky",
  opportunity: "funboy",
  research: "rab",
  command: "nettie",
  "signal media": "torina",
  "signal intel": "funboy",
};

function canonicalDepartmentId(value = "") {
  const lower = String(value || "").trim().toLowerCase();
  return DEPARTMENT_ALIAS_LOOKUP[lower] || lower;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function departmentDisplayName(value = "") {
  const id = canonicalDepartmentId(value);
  const names = {
    nettie: "Nettie",
    van: "Van",
    perry: "Perry",
    torina: "Torina",
    dana: "Dana",
    icky: "Icky",
    funboy: "Funboy",
    rab: "Rab",
    novella: "Novella",
  };
  return names[id] || String(value || "Department").replace(/^[a-z]/, (m) => m.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatCount(value) {
  if (value === null || value === undefined) return "—";
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

function statusTone(status = "idle") {
  const value = String(status).toLowerCase();
  if (["running", "active", "live", "healthy", "ready", "available"].includes(value)) return "active";
  if (["blocked", "rejected", "failed", "error", "critical", "missing", "unavailable", "auth failure"].includes(value)) return "critical";
  if (["queued", "pending", "cooldown", "warning", "review"].includes(value)) return "warning";
  return "idle";
}

function NodeStatusBadge({ status }) {
  return <StatusBadge variant={statusTone(status)}>{status || "idle"}</StatusBadge>;
}

function findRegistryAgent(name = "", registry = []) {
  const target = canonicalDepartmentId(name);
  return safeArray(registry).find((agent) => {
    const aliases = safeArray(agent.aliases);
    return canonicalDepartmentId(agent.id) === target || canonicalDepartmentId(agent.displayName) === target || aliases.some((alias) => canonicalDepartmentId(alias) === target);
  }) || null;
}

function deskSourceLabel(name, registryAgent) {
  if (!registryAgent) return DEPARTMENT_ALIAS_LOOKUP[name] ? 'UNAVAILABLE' : 'UNAVAILABLE';
  const isPrimary = canonicalDepartmentId(registryAgent.displayName) === canonicalDepartmentId(name) || canonicalDepartmentId(registryAgent.id) === canonicalDepartmentId(name);
  if (!isPrimary) return 'REGISTRY-BACKED';
  if (registryAgent.heartbeat?.status === 'live' || ['available', 'assigned', 'active', 'idle'].includes(String(registryAgent.status || '').toLowerCase())) return 'LIVE';
  if (registryAgent.agentFilesystem?.complete || registryAgent.status) return registryAgent.demoOnly ? 'SEEDED' : 'REGISTRY-BACKED';
  return 'UNAVAILABLE';
}

function classifyDeskTransition(item = {}) {
  const status = String(item.status || '').toLowerCase();
  const route = String(item.routeStatus || '').toLowerCase();
  const nextAction = String(item.nextAction || '').toLowerCase();
  if (['blocked', 'failed', 'rejected'].includes(status) || route.includes('blocked') || route.includes('hold') || route.includes('failed') || nextAction.includes('blocked')) return 'blocked';
  if (route.includes('review') || route.includes('qa') || route.includes('approval') || status.includes('review')) return 'reviewing';
  if (status.includes('queue') || status.includes('pending') || status.includes('hold') || route.includes('awaiting')) return 'waiting';
  if (['active', 'running', 'live', 'available', 'assigned'].includes(status)) return 'active';
  return 'idle';
}

function summarizeDeskTransitions(runs = []) {
  const counts = { active: 0, idle: 0, blocked: 0, reviewing: 0, waiting: 0 };
  safeArray(runs).forEach((item) => {
    const state = classifyDeskTransition(item);
    counts[state] = (counts[state] || 0) + 1;
  });
  return counts;
}

function buildDeskItem(name, registry = [], department = null, departmentId = '') {
  const registryAgent = findRegistryAgent(name, registry);
  const sourceLabel = deskSourceLabel(name, registryAgent);
  const displayDepartmentId = canonicalDepartmentId(departmentId || department?.id || '')
  const managerMap = {
    nettie: 'Patrick',
    van: 'Nettie',
    perry: 'Nettie',
    torina: 'Nettie',
    dana: 'Nettie',
    icky: 'Nettie',
    funboy: 'Nettie',
    rab: 'Nettie',
    novella: 'Torina',
  };
  const manager = managerMap[displayDepartmentId] || 'Nettie';
  const role = registryAgent?.roleTitle || department?.title || 'Employee desk';
  const currentWork = registryAgent?.activeQueueCount > 0
    ? `${formatCount(registryAgent.activeQueueCount)} queued packets`
    : (department?.activeQueueCount > 0 ? `${formatCount(department.activeQueueCount)} packets on the floor` : 'No active work packets');
  const skills = safeArray(registryAgent?.permissions).slice(0, 4).map((perm) => perm.replace(/-/g, ' '));
  const tools = registryAgent?.executorRoute?.target ? [registryAgent.executorRoute.target, registryAgent.fallbackRoute?.target || '—'] : ['registry', 'workflow lane'];
  const evidence = registryAgent?.updatedAt ? `Last registry update ${formatDate(registryAgent.updatedAt)} · heartbeat ${registryAgent.heartbeat?.status || 'unknown'}` : 'No live evidence available';
  return {
    agent: name,
    role,
    manager,
    department: department?.name || departmentDisplayName(displayDepartmentId),
    status: registryAgent?.status || (department?.activeQueueCount > 0 ? 'active' : 'idle'),
    currentWork,
    room: department?.title || department?.mandate || null,
    skills: skills.length ? skills : [departmentDisplayName(displayDepartmentId), 'registry-backed desk'],
    tools,
    evidence,
    breakState: registryAgent?.heartbeat?.status && registryAgent.heartbeat.status !== 'live' ? registryAgent.heartbeat.status : null,
    tone: sourceLabel === 'LIVE' ? 'active' : sourceLabel === 'REGISTRY-BACKED' ? 'info' : sourceLabel === 'SEEDED' ? 'warning' : sourceLabel === 'STATIC' ? 'critical' : 'idle',
    sourceLabel,
  };
}

function WorkflowNodeChain({ nodes = [] }) {
  if (!nodes.length) {
    return <p className="text-[10px] text-white/25">No node chain available.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <div className="min-w-max flex items-stretch gap-3">
          {nodes.map((node, index) => {
            const Icon = {
              trigger: Activity,
              routing: Link2,
              agent: Bot,
              review: BadgeCheck,
              approval: Shield,
              evidence: FileText,
              completion: CircleDot,
              completion_rejection: AlertTriangle,
            }[node.type] || Workflow;

            return (
              <div key={node.id || `${node.label}-${index}`} className="flex items-center gap-3">
                <details className="group w-56 shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-white/70">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white/75">{node.label}</p>
                          <p className="text-[9px] uppercase tracking-wider text-white/25">{node.type || "node"}</p>
                        </div>
                      </div>
                      <NodeStatusBadge status={node.status} />
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2 text-[10px] text-white/45">
                    {node.detail ? <p>{node.detail}</p> : null}
                    {node.owner ? <p>Owner: {node.owner}</p> : null}
                    {node.id ? <p>Node ID: {node.id}</p> : null}
                    <p className="text-white/30">Click summary to collapse/expand the node details.</p>
                  </div>
                </details>
                {index < nodes.length - 1 ? <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/20 md:block" /> : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-white/22">n8n-style pipeline with clickable node details, execution truth, and evidence-bearing stages.</p>
    </div>
  );
}

function DepartmentBoardCard({ dept }) {
  return (
    <GlassCard className="h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-white/80">{dept.name}</p>
            <StatusPill status={dept.sourceTruth === "real" ? "live" : "demo"} />
          </div>
          <p className="mt-1 text-[10px] text-white/35">{dept.title}</p>
          <p className="mt-2 text-[10px] text-white/28 leading-relaxed line-clamp-3">{dept.mission}</p>
        </div>
        <LinkButton to={`/departments/${dept.id}`}>Open office</LinkButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Workflow count" value={formatCount(dept.workflowCount)} />
        <MiniStat label="Active queue" value={formatCount(dept.activeQueueCount)} />
        <MiniStat label="Blocked / rejected" value={formatCount(dept.blockedItems)} />
        <MiniStat label="Last execution" value={formatDate(dept.lastExecution)} compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {safeArray(dept.agents).slice(0, 5).map((agent) => (
          <span key={agent} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/55">{agent}</span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] uppercase tracking-wider text-white/25">Next automation</p>
        <p className="mt-1 text-[10px] leading-relaxed text-white/48">{dept.nextRecommendedAutomation}</p>
      </div>
    </GlassCard>
  );
}

function MiniStat({ label, value, compact = false }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[8px] uppercase tracking-wider text-white/22">{label}</p>
      <p className={`mt-1 font-mono text-white/70 ${compact ? "text-[10px]" : "text-[12px]"}`}>{value}</p>
    </div>
  );
}

function SectionStat({ label, value, sub }) {
  return (
    <GlassCard className="py-3">
      <p className="text-[9px] uppercase tracking-wider text-white/25">{label}</p>
      <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{value}</p>
      {sub ? <p className="mt-1 text-[9px] text-white/25">{sub}</p> : null}
    </GlassCard>
  );
}

function RuntimeFeed({ items = [] }) {
  return (
    <div className="space-y-2">
      {items.length ? items.slice(0, 8).map((item) => (
        <div key={item.id || `${item.summary}-${item.updatedAt}`} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
          <span className={`mt-0.5 h-2 w-2 rounded-full ${statusTone(item.truthStatus) === "active" ? "bg-emerald-400" : statusTone(item.truthStatus) === "warning" ? "bg-amber-400" : "bg-white/25"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/70">{item.summary || item.task || item.title || item.id}</p>
            <p className="text-[9px] text-white/25">{formatDate(item.updatedAt)} · {item.truthStatus || "LIVE"}</p>
          </div>
        </div>
      )) : <p className="text-[10px] text-white/25">No runtime feed entries returned yet.</p>}
    </div>
  );
}

function SkillsRunbookRow({ item }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 md:grid-cols-[1.5fr_0.7fr_0.8fr_1fr] md:items-center">
      <div>
        <p className="text-[11px] font-semibold text-white/75">{item.id}</p>
        <p className="mt-1 text-[10px] text-white/28 leading-relaxed">{item.notes}</p>
      </div>
      <div className="text-[10px] text-white/45">Owner: {item.owner}</div>
      <div><StatusBadge variant={item.loaded ? "active" : "critical"}>{item.loaded ? "loaded" : "missing"}</StatusBadge></div>
      <div className="text-[10px] text-white/45">{item.migration}</div>
    </div>
  );
}

export default function DepartmentPage() {
  const { departmentId } = useParams();
  const isOverview = !departmentId;

  const { data: workflowRegistry } = useQuery({
    queryKey: ["departments", "workflows"],
    queryFn: api.departmentsWorkflows,
    refetchInterval: 10000,
  });

  const { data: registryAgents = [] } = useQuery({
    queryKey: ["departments", "agents"],
    queryFn: api.agents,
    refetchInterval: 10000,
  });

  const { data: selectedDepartment } = useQuery({
    queryKey: ["departments", departmentId],
    queryFn: () => api.department(departmentId),
    enabled: Boolean(departmentId),
    refetchInterval: 10000,
  });

  const { data: systemTruth } = useQuery({
    queryKey: ["system", "truth"],
    queryFn: api.system,
    refetchInterval: 10000,
  });

  const { data: queueSummary } = useQuery({
    queryKey: ["departments", "queue-summary"],
    queryFn: api.queueSummary,
    refetchInterval: 10000,
  });

  const { data: runtimeHealth } = useQuery({
    queryKey: ["departments", "runtime-health"],
    queryFn: api.runtimeHealth,
    refetchInterval: 10000,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["departments", "activity-recent"],
    queryFn: api.activityRecent,
    refetchInterval: 10000,
  });

  const { data: jobsSummary } = useQuery({
    queryKey: ["departments", "jobs-summary"],
    queryFn: api.jobsSummary,
    refetchInterval: 10000,
  });

  const { data: executorStatus, error: executorError } = useQuery({
    queryKey: ["departments", "executor-status"],
    queryFn: api.executorStatus,
    retry: false,
    refetchInterval: 10000,
  });

  const departments = safeArray(workflowRegistry?.departments);
  const orderedDepartments = useMemo(() => {
    const map = new Map(departments.map((dept) => [dept.id, dept]));
    return PRIMARY_DEPARTMENTS.map((id) => map.get(id)).filter(Boolean);
  }, [departments]);

  const selectedWorkflow = departments.find((dept) => canonicalDepartmentId(dept.id) === canonicalDepartmentId(departmentId) || canonicalDepartmentId(dept.name) === canonicalDepartmentId(departmentId));
  const detail = useMemo(() => ({ ...(selectedWorkflow || {}), ...(selectedDepartment || {}) }), [selectedDepartment, selectedWorkflow]);
  const templates = safeArray(selectedWorkflow?.workflowTemplates || detail?.workflowTemplates);
  const latestReport = detail?.reports?.latestDepartmentReport || null;
  const reportItems = safeArray(detail?.reports?.items);
  const auditItems = safeArray(detail?.audit);
  const activeJobs = safeArray(detail?.activeJobs);
  const workflowRuns = safeArray(selectedWorkflow?.activeWorkflowRuns);
  const queuedHandoffs = safeArray(selectedWorkflow?.queuedHandoffs);
  const evidenceLogs = safeArray(selectedWorkflow?.evidenceLogs);
  const approvalGates = safeArray(selectedWorkflow?.approvalGates || detail?.approvalGates);
  const blockedRejectedWork = safeArray(selectedWorkflow?.blockedRejectedWork);
  const nextPhaseRecommendations = safeArray(selectedWorkflow?.nextPhaseRecommendations);
  const workflowVisualization = safeArray(selectedWorkflow?.workflowVisualization);
  const blockedRejected = activeJobs.filter((job) => ["blocked", "failed", "rejected", "hold", "cancelled", "archived"].includes(String(job.status).toLowerCase()));
  const runningOrQueued = activeJobs.filter((job) => ["queued", "running", "active", "in_progress", "scoped", "hold"].includes(String(job.status).toLowerCase()));
  const completedJobs = activeJobs.filter((job) => ["complete", "completed", "done", "success"].includes(String(job.status).toLowerCase()));
  const departmentStatus = detail?.status || {};
  const metrics = detail?.metrics || {};
  const approvedGates = safeArray(selectedWorkflow?.qaGates || detail?.qaGates || detail?.approvalGates);
  const routeKeywords = safeArray(detail?.routeKeywords);
  const owner = departmentDisplayName(detail?.name || selectedWorkflow?.name || departmentId);
  const title = detail?.title || selectedWorkflow?.title || "Department command center";
  const officeTruth = selectedWorkflow?.sourceTruth || detail?.sourceTruth || (selectedWorkflow || selectedDepartment ? 'real' : 'unavailable');
  const deskTransitions = summarizeDeskTransitions(workflowRuns);
  const conferenceRoomState = workflowRuns.length || approvalGates.length ? 'occupied' : 'open';
  const breakRoomState = runningOrQueued.length ? 'available' : 'idle';
  const liveHandoffCount = queuedHandoffs.length;
  const liveEvidenceCount = evidenceLogs.length;
  const floorLabels = officeTruth === 'real' ? 'LIVE' : officeTruth === 'demo' ? 'SEEDED' : 'UNAVAILABLE';

  if (isOverview) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Departments"
          subtitle="This is an AI operational company: live command lanes, routing lines, execution truth, and department command centers are visible by default."
          actions={(
            <>
              <LinkButton to="/nettie">Nettie</LinkButton>
              <LinkButton to="/system">System</LinkButton>
            </>
          )}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SectionStat label="Departments" value={formatCount(workflowRegistry?.summary?.totalDepartments || departments.length)} sub="Visible command centers" />
          <SectionStat label="Real / demo" value={`${formatCount(workflowRegistry?.summary?.realDepartments || 0)} / ${formatCount(workflowRegistry?.summary?.demoDepartments || 0)}`} sub="Truth labeling" />
          <SectionStat label="Queue / blocked" value={`${formatCount(queueSummary?.totalQueued || 0)} / ${formatCount(queueSummary?.totalBlocked || 0)}`} sub="Live execution pressure" />
          <SectionStat label="Jobs / approvals" value={`${formatCount(jobsSummary?.totalCompleted || 0)} / ${formatCount(systemTruth?.counts?.approvals || 0)}`} sub="Execution memory" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <SectionCard title="Executive command lane" subtitle="Patrick's operating lane into the company.">
            <div className="grid gap-3 lg:grid-cols-3">
              {COMMAND_LANE.map((lane) => {
                const Icon = lane.icon;
                return (
                  <GlassCard key={lane.label} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 text-white/70"><Icon className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[11px] font-semibold text-white/75">{lane.label}</p>
                        <p className="mt-1 text-[10px] text-white/40">{lane.title}</p>
                        <p className="mt-2 text-[10px] text-white/28 leading-relaxed">{lane.detail}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="AI executor status lane" subtitle="Truthful status for the subscription executor path and current runtime readiness.">
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <MiniStat label="Selected executor" value={systemTruth?.system?.selectedExecutor || "—"} />
                <MiniStat label="Fallback executor" value={systemTruth?.system?.fallbackExecutor || "—"} />
                <MiniStat label="Hermes mode" value={systemTruth?.system?.hermesMode || "—"} />
                <MiniStat label="Bridge state" value={executorError ? "auth failure / unavailable" : executorStatus?.available ? "available" : "unavailable"} />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-[10px] text-white/45">
                <p className="text-white/75 font-semibold">gptCodexSubscriptionAdapter</p>
                <p className="mt-1">{executorError ? `Unverified live path (${executorError.message})` : executorStatus ? `Selected executor ${executorStatus.executor || systemTruth?.system?.selectedExecutor || "codex"} · cooldown ${executorStatus.cooldown || "none"}` : "Scaffolded in UI only; live bridge auth not yet verified from this browser session."}</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Cross-department routing lines" subtitle="A visually obvious handoff path between the core operating departments.">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/55">
                {PRIMARY_DEPARTMENTS.map((id, index) => {
                  const dept = departments.find((item) => item.id === id);
                  if (!dept) return null;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Link to={`/departments/${id}`} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 hover:bg-white/[0.08]">
                        {dept.name}
                      </Link>
                      {index < PRIMARY_DEPARTMENTS.length - 1 ? <ArrowRight className="h-3 w-3 text-white/18" /> : null}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/25">Routing lines express command flow, escalation, and review handoffs between departments.</p>
            </div>
          </SectionCard>

          <SectionCard title="Runtime execution feed" subtitle="Live feed of recent operational activity.">
            <RuntimeFeed items={recentActivity || []} />
          </SectionCard>
        </div>

        <SectionCard title="Department overview board" subtitle="One operational card per department with queue depth, blockers, and next recommended automation.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orderedDepartments.map((dept) => <DepartmentBoardCard key={dept.id} dept={dept} />)}
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${owner} Department Command Center`}
        subtitle={`${title} · ${detail?.domain || "Operational command center"} · workflows, runs, handoffs, evidence, approval gates, and execution health`}
        actions={(
          <>
            <LinkButton to="/departments">All departments</LinkButton>
            <LinkButton to="/operations">Operations</LinkButton>
            <LinkButton to="/nettie">Nettie</LinkButton>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SectionStat label="Current workload" value={formatCount(departmentStatus.currentWorkload ?? metrics.openJobs ?? activeJobs.length)} sub="Live queue depth" />
        <SectionStat label="Blocked / rejected" value={formatCount(departmentStatus.blockedItems ?? blockedRejected.length)} sub="Needs review or recovery" />
        <SectionStat label="Completed / failed" value={`${formatCount(departmentStatus.recentlyCompletedItems ?? metrics.completedJobs ?? 0)} / ${formatCount(metrics.failedJobs ?? 0)}`} sub="Execution history" />
        <SectionStat label="Approval gates" value={formatCount(approvedGates.length)} sub="Governed checkpoints" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Department mission" subtitle="Identity, mandate, team roster, and route keywords are visible.">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Department head" value={detail?.name || owner} />
              <MiniStat label="Title" value={detail?.title || title} />
              <MiniStat label="Domain" value={detail?.domain || "—"} />
              <MiniStat label="Execution health" value={runtimeHealth?.overallHealth || "—"} />
            </div>
            <p className="text-[11px] text-white/45 leading-relaxed">{detail?.mandate || detail?.mission || "No mission available."}</p>
            <div className="flex flex-wrap gap-1.5">
              {safeArray(detail?.agents).map((agent) => (
                <span key={agent} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/55">{agent}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {routeKeywords.map((keyword) => (
                <span key={keyword} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9px] uppercase tracking-wider text-white/28">{keyword}</span>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Employee desks" subtitle="Source-labeled employees for this office.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={detail?.sourceTruth || selectedWorkflow?.sourceTruth || 'live'} />
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">
                {safeArray(detail?.agents).length ? `${safeArray(detail?.agents).length} employee desks` : 'No active work packets'}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {safeArray(detail?.agents).length ? safeArray(detail?.agents).map((agent) => (
                <AgentDesk key={agent} {...buildDeskItem(agent, registryAgents, detail, selectedWorkflow?.id || departmentId)} />
              )) : <p className="text-[10px] text-white/25">No active work packets</p>}
            </div>
          </div>
      </SectionCard>

      <SectionCard title="Department floor states" subtitle="Desk state transitions, conference room state, and break room state are visible as floor truth.">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={officeTruth === 'real' ? 'active' : officeTruth === 'demo' ? 'warning' : 'idle'}>{floorLabels}</StatusBadge>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">source truth: {officeTruth}</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">live workflow runs: {formatCount(workflowRuns.length)}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MiniStat label="Active desks" value={formatCount(deskTransitions.active)} compact />
          <MiniStat label="Idle desks" value={formatCount(deskTransitions.idle)} compact />
          <MiniStat label="Blocked desks" value={formatCount(deskTransitions.blocked)} compact />
          <MiniStat label="Reviewing desks" value={formatCount(deskTransitions.reviewing)} compact />
          <MiniStat label="Waiting desks" value={formatCount(deskTransitions.waiting)} compact />
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-white/75">Conference room state</p>
              <StatusBadge variant={conferenceRoomState === 'occupied' ? 'active' : 'idle'}>{conferenceRoomState}</StatusBadge>
            </div>
            <p className="mt-2 text-[10px] text-white/35 leading-relaxed">Conference room is {conferenceRoomState === 'occupied' ? 'occupied by live workflow activity or approval gates' : 'open and available for the next handoff.'}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <MiniStat label="Approval gates" value={formatCount(approvalGates.length)} compact />
              <MiniStat label="Queued handoffs" value={formatCount(liveHandoffCount)} compact />
              <MiniStat label="Blocked records" value={formatCount(blockedRejectedWork.length)} compact />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-white/75">Break room / idle state</p>
              <StatusBadge variant={breakRoomState === 'available' ? 'warning' : 'idle'}>{breakRoomState}</StatusBadge>
            </div>
            <p className="mt-2 text-[10px] text-white/35 leading-relaxed">Agents without active packets fall back to break room or idle state until the next packet lands.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <MiniStat label="Live evidence logs" value={formatCount(liveEvidenceCount)} compact />
              <MiniStat label="Next phase notes" value={formatCount(nextPhaseRecommendations.length)} compact />
            </div>
          </GlassCard>
        </div>
      </SectionCard>

      <SectionCard title="Department execution health" subtitle="What the department is carrying right now.">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={officeTruth === 'real' ? 'active' : officeTruth === 'demo' ? 'warning' : 'idle'}>{floorLabels}</StatusBadge>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">queue source: live</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">registry source: {officeTruth}</span>
        </div>
        <KeyValueList
            items={[
              { label: "Open jobs", value: formatCount(metrics.openJobs ?? activeJobs.length) },
              { label: "Completed jobs", value: formatCount(metrics.completedJobs ?? departmentStatus.recentlyCompletedItems ?? 0) },
              { label: "Failed jobs", value: formatCount(metrics.failedJobs ?? 0) },
              { label: "Average turnaround", value: metrics.averageTurnaround || departmentStatus.averageTurnaround || "—" },
              { label: "High risk items", value: formatCount(metrics.highRiskItems ?? 0) },
              { label: "Queue status", value: queueSummary?.truthStatus || runtimeHealth?.queueStatus || "LIVE" },
            ]}
          />
          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-[10px] text-white/45">
            <p className="text-white/75 font-semibold">Next recommended action</p>
            <p className="mt-1 leading-relaxed">{detail?.nextRecommendedAutomation || "Review active jobs and stage the next workflow step."}</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Workflow pipeline visualization" subtitle="Trigger, routing, agent execution, review, approval, evidence, and completion are visible as a node chain.">
        <div className="space-y-4">
          {templates.length ? templates.map((template) => (
            <div key={template.id} className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[12px] font-semibold text-white/75">{template.name}</p>
                  <p className="text-[10px] text-white/30">{template.description}</p>
                </div>
                <StatusPill status={template.status} />
              </div>
              <WorkflowNodeChain nodes={template.nodeChain || []} />
            </div>
          )) : <p className="text-[10px] text-white/25">No live workflow records yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Workflow canvas" subtitle="Work packets move through desks, handoffs, evidence, and completion.">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge variant={officeTruth === 'real' ? 'active' : officeTruth === 'demo' ? 'warning' : 'idle'}>{floorLabels}</StatusBadge>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">workflow source: registry-backed</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">visualization nodes: {formatCount(workflowVisualization.length)}</span>
        </div>
        <WorkflowCanvas
          title="Department work packet canvas"
          subtitle="Workflow state is rendered as a node chain using live registry and queue truth."
          nodes={safeArray(selectedWorkflow?.workflowVisualization)}
          footer={safeArray(selectedWorkflow?.workflowVisualization).length ? 'Live workflow nodes are surfaced from the department registry.' : 'No live workflow records yet.'}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Active jobs" subtitle="Live work assigned to this department.">
          <SimpleTable
            columns={[
              { key: "id", label: "Job ID" },
              { key: "task", label: "Task" },
              { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "priority", label: "Priority" },
              { key: "nextAction", label: "Next action" },
            ]}
            rows={runningOrQueued}
            empty="No active work packets"
          />
        </SectionCard>

        <SectionCard title="Blocked / rejected work" subtitle="What needs review, correction, or escalation before it can continue.">
          <SimpleTable
            columns={[
              { key: "id", label: "Job ID" },
              { key: "task", label: "Task" },
              { key: "status", label: "State", render: (row) => <NodeStatusBadge status={row.status} /> },
              { key: "routeStatus", label: "Route" },
              { key: "nextAction", label: "Next action" },
            ]}
            rows={blockedRejected}
            empty="No blocked work packets"
          />
        </SectionCard>
      </div>

      <SectionCard title="Completed work" subtitle="Finished packets, archived outcomes, and wrapped tasks.">
        <SimpleTable
          columns={[
            { key: "id", label: "Job ID" },
            { key: "task", label: "Task" },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "updatedAt", label: "Completed" },
            { key: "nextAction", label: "Next action" },
          ]}
          rows={completedJobs}
          empty="No completed work packets"
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Approval gates" subtitle="Explicit checkpoints required before moving work to the next phase.">
          <div className="flex flex-wrap gap-2">
            {approvedGates.length ? approvedGates.map((gate) => (
              <span key={gate} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/55">{gate}</span>
            )) : <p className="text-[10px] text-white/25">No explicit approval gates surfaced.</p>}
          </div>
        </SectionCard>

      <SectionCard title="Evidence drawer" subtitle="Reports, audit entries, and supporting evidence are visible here.">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge variant={officeTruth === 'real' ? 'active' : officeTruth === 'demo' ? 'warning' : 'idle'}>{floorLabels}</StatusBadge>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">evidence logs: {formatCount(liveEvidenceCount)}</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">reports: {formatCount(reportItems.length)}</span>
        </div>
        <div className="space-y-2">
            {latestReport ? (
              <GlassCard className="p-3">
                <p className="text-[11px] font-semibold text-white/75">Latest report</p>
                <p className="mt-1 text-[10px] text-white/35">{latestReport.title}</p>
                <p className="mt-2 text-[10px] text-white/25">{latestReport.status} · {formatDate(latestReport.createdAt)}</p>
              </GlassCard>
            ) : null}
            {reportItems.length ? reportItems.slice(0, 3).map((item) => (
              <GlassCard key={item.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-white/75">{item.title || item.summary || item.id}</p>
                  <StatusBadge variant={statusTone(item.status || item.truthStatus)}>{item.status || item.truthStatus || "live"}</StatusBadge>
                </div>
                <p className="mt-1 text-[10px] text-white/25">{formatDate(item.createdAt)}</p>
              </GlassCard>
            )) : null}
            {auditItems.length ? auditItems.slice(0, 3).map((entry) => (
              <GlassCard key={`${entry.at}-${entry.action}`} className="p-3">
                <p className="text-[11px] font-semibold text-white/75">{entry.action}</p>
                <p className="mt-1 text-[10px] text-white/25">{entry.note}</p>
                <p className="mt-1 text-[9px] text-white/20">{formatDate(entry.at)}</p>
              </GlassCard>
            )) : null}
            {evidenceLogs.length ? evidenceLogs.slice(0, 3).map((entry) => (
              <GlassCard key={entry.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-white/75">{entry.summary}</p>
                  <StatusBadge variant={statusTone(entry.truthStatus || entry.type)}>{entry.truthStatus || entry.type || 'live'}</StatusBadge>
                </div>
                <p className="mt-1 text-[9px] text-white/20">{formatDate(entry.at)}</p>
              </GlassCard>
            )) : null}
            {!latestReport && !reportItems.length && !auditItems.length && !evidenceLogs.length ? <p className="text-[10px] text-white/25">No evidence or audit items returned for this department.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Internal messages / handoffs" subtitle="Visible handoff notes and inter-desk communication.">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge variant={officeTruth === 'real' ? 'active' : officeTruth === 'demo' ? 'warning' : 'idle'}>{floorLabels}</StatusBadge>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">handoff lines: {formatCount(liveHandoffCount)}</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/50">next phase notes: {formatCount(nextPhaseRecommendations.length)}</span>
        </div>
        <div className="space-y-2">
          {safeArray(selectedWorkflow?.queuedHandoffs).length ? safeArray(selectedWorkflow.queuedHandoffs).slice(0, 6).map((handoff) => (
            <GlassCard key={handoff.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-white/75">{handoff.task}</p>
                <StatusBadge variant={statusTone(handoff.status)}>{handoff.status || 'queued'}</StatusBadge>
              </div>
              <p className="mt-1 text-[10px] text-white/25">Owner: {handoff.owner || owner}</p>
              <p className="mt-1 text-[10px] text-white/35">{handoff.handoffReason || 'No handoff reason recorded'}</p>
            </GlassCard>
          )) : <p className="text-[10px] text-white/25">No internal messages yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Department command surface" subtitle="Actionable tasks and supporting table state for this office.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SectionStat label="Waiting on user" value={formatCount(departmentStatus.waitingOnUserItems ?? 0)} sub="Approval required" />
          <SectionStat label="Waiting on client" value={formatCount(departmentStatus.waitingOnClientItems ?? 0)} sub="External dependency" />
          <SectionStat label="Overdue" value={formatCount(departmentStatus.overdueItems ?? 0)} sub="Needs attention" />
          <SectionStat label="Recent completions" value={formatCount(departmentStatus.recentlyCompletedItems ?? 0)} sub="Progress signal" />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-4">
            <p className="text-[11px] font-semibold text-white/75">Department action list</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {safeArray(detail?.actions).map((action) => (
                <span key={action} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/55">{action}</span>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[11px] font-semibold text-white/75">Department source truth</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <MiniStat label="Source truth" value={selectedWorkflow?.sourceTruth || "real"} compact />
              <MiniStat label="Last execution" value={formatDate(detail?.lastExecution || selectedWorkflow?.lastExecution)} compact />
              <MiniStat label="Reports" value={formatCount(detail?.reports?.generatedReports || 0)} compact />
              <MiniStat label="Queue total" value={formatCount(queueSummary?.totalQueued || 0)} compact />
            </div>
          </GlassCard>
        </div>
      </SectionCard>

      <SectionCard title="Skills / Runbooks" subtitle="Visible migration surface for the MC-side operational skill set.">
        <div className="space-y-2">
          {SKILL_SURFACE.map((item) => <SkillsRunbookRow key={item.id} item={item} />)}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Department runtime snapshot" subtitle="Data used to build this office command center.">
          <KeyValueList
            items={[
              { label: "Workflow registry", value: workflowRegistry?.generatedAt || "—" },
              { label: "Queue summary", value: queueSummary?.updatedAt || "—" },
              { label: "Runtime health", value: runtimeHealth?.updatedAt || "—" },
              { label: "Executor truth", value: systemTruth?.system?.updatedAt || "—" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Next-phase recommendation" subtitle="What this department should do next.">
          <div className="space-y-2">
            <GlassCard className="p-3">
              <p className="text-[11px] text-white/75">{detail?.nextRecommendedAutomation || "Review active jobs and promote the next workflow step."}</p>
            </GlassCard>
            <GlassCard className="p-3">
              <p className="text-[10px] text-white/25">Visible command center now exposes identity, roster, queue state, blocked work, approvals, evidence, and node-chain workflow visualization.</p>
            </GlassCard>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
