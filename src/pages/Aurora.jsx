import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  Copy,
  Database,
  Eye,
  Layers3,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  Bot,
  TerminalSquare,
} from "lucide-react";

import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { api } from "@/lib/api";
import {
  DEPARTMENTS,
  DEMO_COMMANDS,
  buildSeedState,
  buildWorkflowBundle,
  getCurrentJob,
  getCurrentNode,
  getDepartmentJobCount,
  getEvidenceForJob,
  getMessagesForJob,
  getModelRunsForJob,
  getWorkflowEdgesForJob,
  getWorkflowNodesForJob,
  getWorkflowForJob,
  loadAuroraState,
  routeFromCommand,
  saveAuroraState,
  sortJobsNewestFirst,
} from "@/lib/auroraPoc";

const STATUS_VARIANTS = {
  completed: "active",
  running: "info",
  blocked: "critical",
  awaiting_approval: "warning",
  pending: "idle",
};

const TABS = DEPARTMENTS;

function prettyStatus(status = "") {
  return String(status).replace(/_/g, " ").toUpperCase();
}

function statusLabel(status = "") {
  if (status === "awaiting_approval") return "APPROVAL";
  return prettyStatus(status);
}

function copyText(value) {
  if (!value) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {});
  }
}

function TimelineNode({ node, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(node.id)}
      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all duration-150 ${selected
        ? "border-emerald-500/30 bg-emerald-500/10"
        : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.09]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-black/20">
          <span className="text-[9px] font-mono text-white/40">{node.node_order}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-medium text-white/75">{node.label}</p>
            <StatusBadge variant={STATUS_VARIANTS[node.status] || "idle"} dot={false}>{statusLabel(node.status)}</StatusBadge>
            <span className="text-[9px] text-white/25">{node.node_type}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-white/28">
            <span className="rounded-md border border-white/[0.05] px-2 py-0.5">{node.assigned_agent_or_skill_node}</span>
            <span className="rounded-md border border-white/[0.05] px-2 py-0.5">{node.task_type}</span>
            <span className="rounded-md border border-white/[0.05] px-2 py-0.5">{node.model_used}</span>
            {node.tool_used ? <span className="rounded-md border border-white/[0.05] px-2 py-0.5">{node.tool_used}</span> : null}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/42">{node.output}</p>
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, right }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-emerald-400" /> : null}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{title}</p>
        {subtitle ? <p className="text-[10px] text-white/30">{subtitle}</p> : null}
      </div>
      {right ? <div className="ml-auto">{right}</div> : null}
    </div>
  );
}

export default function Aurora() {
  const queryClient = useQueryClient();
  const [state, setState] = useState(() => loadAuroraState());
  const [activeDepartment, setActiveDepartment] = useState(state.activeDepartment || "Dana");
  const [selectedJobId, setSelectedJobId] = useState(state.selectedJobId || null);
  const [selectedNodeId, setSelectedNodeId] = useState(state.selectedNodeId || null);
  const [command, setCommand] = useState("");
  const [inputError, setInputError] = useState("");

  const createJobMutation = useMutation({
    mutationFn: async ({ title, owner, description }) => {
      try {
        return await api.createJob({ title, owner, description, priority: owner === "Perry" ? "P0" : "P1" });
      } catch {
        return null;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['costs'] });
    },
  });

  useEffect(() => {
    saveAuroraState({ ...state, activeDepartment, selectedJobId, selectedNodeId });
  }, [state, activeDepartment, selectedJobId, selectedNodeId]);

  const jobsByDepartment = useMemo(() => {
    const jobs = sortJobsNewestFirst(state.jobs || []);
    return TABS.reduce((acc, dept) => {
      acc[dept] = dept === "Nettie" ? jobs : jobs.filter((job) => job.assigned_department === dept);
      return acc;
    }, {});
  }, [state.jobs]);

  const currentJob = useMemo(() => getCurrentJob(state, selectedJobId, activeDepartment), [state, selectedJobId, activeDepartment]);
  const currentWorkflow = useMemo(() => getWorkflowForJob(state, currentJob?.id), [state, currentJob]);
  const currentNodes = useMemo(() => getWorkflowNodesForJob(state, currentJob?.id), [state, currentJob]);
  const currentEdges = useMemo(() => getWorkflowEdgesForJob(state, currentJob?.id), [state, currentJob]);
  const currentEvidence = useMemo(() => getEvidenceForJob(state, currentJob?.id), [state, currentJob]);
  const currentMessages = useMemo(() => getMessagesForJob(state, currentJob?.id), [state, currentJob]);
  const currentModelRuns = useMemo(() => getModelRunsForJob(state, currentJob?.id), [state, currentJob]);
  const currentNode = useMemo(() => getCurrentNode(state, currentJob?.id, selectedNodeId), [state, currentJob, selectedNodeId]);
  const nettieReply = useMemo(() => currentJob ? state.nettie_feed?.find((entry) => entry.job_id === currentJob.id) : null, [state.nettie_feed, currentJob]);

  useEffect(() => {
    if (!currentJob) return;
    const nextNode = currentNodes.find((node) => node.status === "blocked") || currentNodes.find((node) => node.status === "awaiting_approval") || currentNodes[currentNodes.length - 1] || null;
    if (selectedJobId !== currentJob.id) {
      setSelectedJobId(currentJob.id);
      setSelectedNodeId(nextNode?.id || null);
    } else if (!currentNode && nextNode) {
      setSelectedNodeId(nextNode.id);
    }
  }, [currentJob, currentNodes, currentNode, selectedJobId]);

  const currentRoute = currentJob ? routeFromCommand(currentJob.original_command) : routeFromCommand("");
  const totalJobs = state.jobs?.length || 0;
  const blockedJobs = (state.jobs || []).filter((job) => job.status === "blocked").length;
  const approvals = (state.jobs || []).filter((job) => job.approval_required).length;
  const evidenceCount = state.evidence_logs?.length || 0;

  const submitCommand = async (value) => {
    const text = String(value || command).trim();
    if (!text) {
      setInputError("Enter a command first.");
      return;
    }

    setInputError("");
    setCommand(text);

    const bundle = buildWorkflowBundle(text, { createdAt: new Date().toISOString() });
    const backendJob = await createJobMutation.mutateAsync({
      title: text,
      owner: bundle.job.assigned_department,
      description: `Aurora POC command routed to ${bundle.job.assigned_department}.`,
    });

    const hydratedBundle = {
      ...bundle,
      job: {
        ...bundle.job,
        backend_job_id: backendJob?.id || null,
      },
    };

    const nextState = {
      ...state,
      jobs: sortJobsNewestFirst([hydratedBundle.job, ...(state.jobs || []).filter((job) => job.id !== hydratedBundle.job.id)]),
      department_workflows: [hydratedBundle.workflow, ...(state.department_workflows || []).filter((workflow) => workflow.job_id !== hydratedBundle.job.id)],
      workflow_nodes: [...hydratedBundle.nodes, ...(state.workflow_nodes || []).filter((node) => node.job_id !== hydratedBundle.job.id)],
      workflow_edges: [...hydratedBundle.edges, ...(state.workflow_edges || []).filter((edge) => edge.job_id !== hydratedBundle.job.id)],
      evidence_logs: [...hydratedBundle.evidenceLogs, ...(state.evidence_logs || []).filter((entry) => entry.job_id !== hydratedBundle.job.id)],
      agent_messages: [...hydratedBundle.agentMessages, ...(state.agent_messages || []).filter((entry) => entry.job_id !== hydratedBundle.job.id)],
      model_runs: [...hydratedBundle.modelRuns, ...(state.model_runs || []).filter((entry) => entry.job_id !== hydratedBundle.job.id)],
      nettie_feed: [
        {
          job_id: hydratedBundle.job.id,
          department: hydratedBundle.route.department,
          text: hydratedBundle.nettieReply.text,
          status: hydratedBundle.nettieReply.status,
          risk_tier: hydratedBundle.nettieReply.risk_tier,
          approval_required: hydratedBundle.nettieReply.approval_required,
          created_at: hydratedBundle.job.created_at,
        },
        ...(state.nettie_feed || []).filter((entry) => entry.job_id !== hydratedBundle.job.id),
      ],
    };

    setState(nextState);
    setActiveDepartment(hydratedBundle.route.department);
    setSelectedJobId(hydratedBundle.job.id);
    const nextNode = hydratedBundle.nodes.find((node) => node.status === "blocked") || hydratedBundle.nodes.find((node) => node.status === "awaiting_approval") || hydratedBundle.nodes[hydratedBundle.nodes.length - 1];
    setSelectedNodeId(nextNode?.id || null);
  };

  const handleDemoClick = (value) => {
    setCommand(value);
    submitCommand(value);
  };

  const resetSeed = () => {
    const seed = buildSeedState();
    setState(seed);
    setActiveDepartment(seed.activeDepartment || "Dana");
    setSelectedJobId(seed.selectedJobId || seed.jobs?.[0]?.id || null);
    setSelectedNodeId(seed.selectedNodeId || null);
    setCommand("");
    setInputError("");
  };

  const currentDeptJobs = jobsByDepartment[activeDepartment] || [];
  const visibleDepartment = activeDepartment;

  return (
    <div className="space-y-4 pb-5">
      <GlassCard className="border border-emerald-500/15 bg-emerald-500/[0.03]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Aurora POC</p>
              <p className="text-[10px] text-white/35">Visible routing · stored jobs · evidence-backed results · approval gates</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusBadge variant="active">Live Demo</StatusBadge>
            <StatusBadge variant={currentJob?.approval_required ? "warning" : "info"}>{currentJob?.approval_required ? "Approval Required" : "No Approval Needed"}</StatusBadge>
            <StatusBadge variant={currentJob?.status === "blocked" ? "critical" : currentJob?.status === "awaiting_approval" ? "warning" : "active"}>{currentJob?.status || "IDLE"}</StatusBadge>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-4">
          <GlassCard className="border border-white/[0.07]">
            <SectionHeader
              title="Command Intake"
              subtitle="Every request becomes a stored job with visible routing and evidence."
              icon={TerminalSquare}
              right={
                <button onClick={resetSeed} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/45 hover:text-white/70">
                  <RefreshCw className="h-3.5 w-3.5" /> Reset seed
                </button>
              }
            />
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div>
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-3 text-[12px] text-white/80 placeholder:text-white/20 outline-none transition-colors focus:border-emerald-500/30"
                  placeholder="Enter a command for Nettie..."
                />
                {inputError ? <p className="mt-1 text-[10px] text-red-300">{inputError}</p> : null}
              </div>
              <div className="flex min-w-[160px] flex-col gap-2">
                <button
                  onClick={() => submitCommand()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                >
                  <Send className="h-4 w-4" /> Create Job
                </button>
                <button
                  onClick={() => copyText(currentJob?.original_command || command)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[11px] text-white/50 hover:text-white/75"
                >
                  <Copy className="h-4 w-4" /> Copy command
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DEMO_COMMANDS.map((demo) => (
                <button
                  key={demo}
                  onClick={() => handleDemoClick(demo)}
                  className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/35 hover:text-white/70"
                >
                  {demo}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Department Workflow Tabs" subtitle="Select a department and inspect its live workflow lane." icon={Layers3} />
            <div className="flex flex-wrap gap-2">
              {TABS.map((department) => {
                const count = getDepartmentJobCount(state, department);
                const active = visibleDepartment === department;
                return (
                  <button
                    key={department}
                    onClick={() => {
                      setActiveDepartment(department);
                      const nextJob = department === "Nettie" ? state.jobs?.[0] : jobsByDepartment[department]?.[0];
                      setSelectedJobId(nextJob?.id || null);
                      setSelectedNodeId(null);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-all ${active
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-white/[0.06] bg-white/[0.03] text-white/45 hover:text-white/75"
                    }`}
                  >
                    {department} <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] text-white/35">{count}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Current Department</p>
                <p className="text-[10px] text-white/30">{visibleDepartment === "Nettie" ? "Command Center" : `${visibleDepartment} workflow lane`}</p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <StatusBadge variant={currentJob?.approval_required ? "warning" : "info"}>{currentJob?.risk_tier || "Tier 0"}</StatusBadge>
                <StatusBadge variant={STATUS_VARIANTS[currentJob?.status] || "idle"}>{currentJob?.status || "idle"}</StatusBadge>
                <StatusBadge variant={currentJob?.approval_required ? "warning" : "active"}>{currentJob?.approval_required ? "Approval Gate" : "Auto Route"}</StatusBadge>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-wider text-white/25">Job</p>
                <p className="mt-1 text-[12px] font-medium text-white/70">{currentJob?.original_command || "No job selected"}</p>
                <p className="mt-1 text-[9px] text-white/25">{currentJob?.id || "—"}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-wider text-white/25">Routing</p>
                <p className="mt-1 text-[12px] font-medium text-white/70">{currentJob?.assigned_department || "Nettie"}</p>
                <p className="mt-1 text-[9px] text-white/25">{currentJob?.assigned_agent_or_node || "Command Center"}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-wider text-white/25">Model Gateway</p>
                <p className="mt-1 text-[12px] font-medium text-white/70">{currentModelRuns[0]?.provider || "demo_provider"}</p>
                <p className="mt-1 text-[9px] text-white/25">{currentModelRuns[0]?.task_type || currentRoute.task_type || "demo_mode"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-2 text-[10px] text-white/35">
              <Workflow className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-white/40">Command Received → Nettie Classification → Department Intake → Model / Tool Step → Evidence Capture → Return Answer</span>
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Workflow Nodes" subtitle="Each visible node corresponds to a persisted workflow step record." icon={Workflow} right={<span className="text-[10px] text-white/25 font-mono">{currentNodes.length} nodes</span>} />
            <div className="space-y-2">
              {currentNodes.map((node) => (
                <TimelineNode key={node.id} node={node} selected={node.id === currentNode?.id} onSelect={setSelectedNodeId} />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Job History" subtitle="Recent jobs for the selected department." icon={Clock3} />
            <div className="grid gap-2 lg:grid-cols-2">
              {sortJobsNewestFirst(currentDeptJobs).map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setSelectedNodeId(null);
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left transition-all ${job.id === currentJob?.id
                    ? "border-emerald-500/25 bg-emerald-500/10"
                    : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={STATUS_VARIANTS[job.status] || "idle"} dot={false}>{prettyStatus(job.status)}</StatusBadge>
                    <span className="text-[9px] text-white/22">{job.risk_tier}</span>
                    {job.approval_required ? <StatusBadge variant="warning" dot={false}>approval</StatusBadge> : null}
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-white/70">{job.original_command}</p>
                  <p className="mt-1 text-[9px] text-white/25">{job.output_summary}</p>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Nettie Response" subtitle="What the command center returns to Patrick." icon={MessageSquare} />
            <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
              <p className="text-[11px] leading-relaxed text-white/70">{nettieReply?.text || currentJob?.output_summary || "Awaiting command."}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/35">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Department</p>
                <p className="mt-1 text-white/65">{nettieReply?.department || currentJob?.assigned_department || "Nettie"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Risk / Approval</p>
                <p className="mt-1 text-white/65">{nettieReply?.risk_tier || currentJob?.risk_tier || "Tier 0"}{currentJob?.approval_required ? " · approval" : ""}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Evidence Drawer" subtitle="Selected node evidence and log records." icon={Database} />
            {currentNode ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-medium text-white/75">{currentNode.label}</p>
                    <StatusBadge variant={STATUS_VARIANTS[currentNode.status] || "idle"} dot={false}>{statusLabel(currentNode.status)}</StatusBadge>
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">{currentNode.output}</p>
                  <p className="mt-2 text-[9px] text-white/25">Actor: {currentNode.assigned_agent_or_skill_node}</p>
                  <p className="mt-1 text-[9px] text-white/25">Tool: {currentNode.tool_used} · Model: {currentNode.model_used} · Task type: {currentNode.task_type}</p>
                  <p className="mt-1 text-[9px] text-white/25">Reason: {currentNode.reason_selected}</p>
                  <p className="mt-1 text-[9px] text-white/25">Limitations: {(currentNode.limitations || []).join(" · ")}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3 text-[10px] text-white/35">
                  <p className="uppercase tracking-wider text-white/20">Evidence Record</p>
                  <p className="mt-1 text-white/60">{currentEvidence.find((entry) => entry.node_id === currentNode.id)?.result_summary || currentNode.output}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3 text-[10px] text-white/35">
                  <p className="uppercase tracking-wider text-white/20">Model Gateway</p>
                  {currentModelRuns.map((run) => (
                    <div key={run.id} className="mt-2 space-y-1 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={run.status === "demo_mode" ? "warning" : "active"} dot={false}>{run.status}</StatusBadge>
                        <span className="text-white/55">{run.task_type}</span>
                      </div>
                      <p className="text-white/60">Intended: {run.provider} / {run.model}</p>
                      <p className="text-white/40">Actual: {run.actual_provider} / {run.actual_model}</p>
                      <p className="text-white/35">Reason: {run.reason_selected}</p>
                      <p className="text-white/35">Limitations: {(run.limitations || []).join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] text-white/35">Select a node to inspect the evidence record.</div>
            )}
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Execution Trace" subtitle="Persisted handoffs and event logs." icon={Layers3} />
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {currentMessages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3 text-[10px] text-white/35">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={message.message_type === "blocked_notice" ? "critical" : message.message_type === "review_response" ? "warning" : "active"} dot={false}>{message.message_type}</StatusBadge>
                    <span className="text-white/25">{message.from_agent} → {message.to_agent}</span>
                  </div>
                  <p className="mt-2 text-white/60">{message.content}</p>
                </div>
              ))}
              {currentMessages.length === 0 ? <p className="text-[11px] text-white/30">No execution trace available yet.</p> : null}
            </div>
          </GlassCard>

          <GlassCard className="border border-white/[0.07]">
            <SectionHeader title="Job Ledger" subtitle="Stored, selectable, and backed by a backend job record when available." icon={ShieldCheck} />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-white/35">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Jobs</p>
                <p className="mt-1 text-white/65">{totalJobs}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Evidence</p>
                <p className="mt-1 text-white/65">{evidenceCount}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Blocked</p>
                <p className="mt-1 text-white/65">{blockedJobs}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                <p className="uppercase tracking-wider text-white/20">Approvals</p>
                <p className="mt-1 text-white/65">{approvals}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-white/30">
              <span className="rounded-full border border-white/[0.05] px-2 py-1">Workflow nodes: {state.workflow_nodes?.length || 0}</span>
              <span className="rounded-full border border-white/[0.05] px-2 py-1">Edges: {currentEdges.length}</span>
              <span className="rounded-full border border-white/[0.05] px-2 py-1">Model runs: {state.model_runs?.length || 0}</span>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="border border-white/[0.07]">
        <SectionHeader title="Demo Commands" subtitle="Six plus working vertical slices from the Aurora POC." icon={Bot} />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {DEMO_COMMANDS.map((demo) => (
            <button
              key={demo}
              onClick={() => handleDemoClick(demo)}
              className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-left text-[11px] text-white/60 hover:border-emerald-500/20 hover:bg-emerald-500/10"
            >
              {demo}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Selected Node</p>
          <span className="text-[10px] text-white/30">Click any workflow node to inspect evidence.</span>
          <button onClick={() => copyText(currentNode?.output || "")} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/45 hover:text-white/75">
            <Copy className="h-3.5 w-3.5" /> Copy node output
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              <p className="text-[12px] font-medium text-white/75">{currentNode?.label || "No node selected"}</p>
              {currentNode ? <StatusBadge variant={STATUS_VARIANTS[currentNode.status] || "idle"} dot={false}>{statusLabel(currentNode.status)}</StatusBadge> : null}
            </div>
            <div className="mt-2 space-y-2 text-[10px] text-white/35">
              <p><span className="text-white/20">Input:</span> {currentNode?.input || "—"}</p>
              <p><span className="text-white/20">Output:</span> {currentNode?.output || "—"}</p>
              <p><span className="text-white/20">Evidence ID:</span> {currentNode?.evidence_id || "—"}</p>
              <p><span className="text-white/20">Node type:</span> {currentNode?.node_type || "—"}</p>
              <p><span className="text-white/20">Workflow:</span> {currentWorkflow?.workflow_name || "—"}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3 text-[10px] text-white/35">
            <p className="uppercase tracking-wider text-white/20">Workflow Path</p>
            <p className="mt-2 leading-relaxed text-white/55">
              {(currentNodes || []).map((node, index) => (
                <span key={node.id}>
                  <span className={node.id === currentNode?.id ? "text-emerald-300" : "text-white/55"}>{node.label}</span>
                  {index < currentNodes.length - 1 ? <span className="text-white/15"> → </span> : null}
                </span>
              ))}
            </p>
            <div className="mt-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2">
              <p className="text-white/25">Edges</p>
              <p className="mt-1 text-white/55">{currentEdges.length} sequential edges persisted for this workflow.</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
