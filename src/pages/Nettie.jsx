import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Brain, ChevronRight, Paperclip, Send, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import { deriveNettieTruth } from "@/lib/runtimeTruthPolicy";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toChatMessage(message) {
  return {
    id: message.id || crypto.randomUUID(),
    from: message.from || message.sender || "Nettie",
    role: message.role || (message.from === "Patrick" ? "Operator" : "Executive Assistant"),
    kind: message.kind || "system",
    text: message.text || message.body || message.replyMarkdown || "",
    ts: message.ts || message.createdAt || null,
    jobId: message.jobId || null,
    workerId: message.workerId || null,
    threadId: message.threadId || null,
  };
}

function loadLocalThread() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("mc-nettie-thread-v1");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalThread(messages) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("mc-nettie-thread-v1", JSON.stringify(messages.slice(-50)));
  } catch {
    // ignore persistence failures
  }
}

function parseRecentConversation(item) {
  const subject = item.subject || item.title || "Untitled command";
  const preview = item.preview || item.summary || item.replyMarkdown?.split("\n").find(Boolean) || "";
  return {
    id: item.id || crypto.randomUUID(),
    subject,
    preview,
    time: formatTime(item.updatedAt || item.createdAt || item.ts),
    sourceTruth: item.truthStatus || item.executionMode || "LIVE",
    executionMode: item.executionMode || null,
    jobId: item.createdJobs?.[0]?.jobId || item.jobId || null,
    assignedDepartmentHead: item.assignedDepartmentHead || item.createdJobs?.[0]?.owner || null,
    assignedAgent: item.assignedAgent || item.createdJobs?.[0]?.owner || null,
    workflowLink: item.workflowLink || null,
    departmentLink: item.departmentLink || null,
  };
}

function ActionPill({ label, active = false, muted = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[10px] font-medium transition-colors",
        active ? "border-white/18 bg-white/10 text-white/80" : "border-white/[0.06] bg-white/[0.02] text-white/45 hover:text-white/70 hover:bg-white/[0.05]",
        muted ? "opacity-70" : "",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function MessageBubble({ message }) {
  const isPatrick = message.from === "Patrick";
  const isPending = message.kind === "pending";
  const bubbleClass = isPatrick
    ? "ml-auto bg-blue-500/12 border-blue-500/20 text-white/85"
    : "mr-auto bg-white/[0.03] border-white/[0.06] text-white/75";

  return (
    <div className={`max-w-[78%] rounded-2xl border px-4 py-3 ${bubbleClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold">{message.from}</p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">{message.role || ""}</p>
        </div>
        <div className="text-[9px] text-white/25">{formatTime(message.ts)}</div>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-white/75">{message.text || ""}</div>
      {isPending && <p className="mt-2 text-[10px] text-blue-300/70">Processing through Nettie…</p>}
      {!isPatrick && message.jobId && <p className="mt-2 text-[10px] text-white/35">Job ID: {message.jobId}</p>}
    </div>
  );
}

function normalizeNettieResult(data) {
  const createdJobs = Array.isArray(data?.createdJobs)
    ? data.createdJobs.map((job) => ({
        jobId: job.jobId || job.id,
        task: job.task || job.title || "Untitled job",
        owner: job.owner || job.agent || job.department || "Unknown",
        status: job.status || "queued",
        routeStatus: job.routeStatus || job.workflowExecution?.routeStatus || job.workflowExecution?.currentStep || null,
        executionMode: job.executionMode || job.workflowExecution?.executionMode || null,
        workflowExecution: job.workflowExecution || null,
        blockers: job.blockers || job.workflowExecution?.blockers || [],
        logs: job.logs || job.workflowExecution?.logs || [],
        evidence: job.evidence || job.workflowExecution?.evidence || null,
      }))
    : [];
  const primaryJob = createdJobs[0] || null;
  const assignedDepartmentHead = data?.assignedDepartmentHead || primaryJob?.owner || null;
  const assignedAgent = data?.assignedAgent || primaryJob?.owner || null;
  const jobId = data?.jobId || data?.packetId || primaryJob?.jobId || primaryJob?.id || null;
  const workflowLink = data?.workflowLink || (assignedDepartmentHead ? `/departments/${String(assignedDepartmentHead).toLowerCase()}/agents/${String(assignedAgent || assignedDepartmentHead).toLowerCase()}` : null);
  const departmentLink = data?.departmentLink || data?.packetLink || (assignedDepartmentHead ? `/departments/${String(assignedDepartmentHead).toLowerCase()}` : null);
  const executionMode = data?.executionMode || (primaryJob ? "MC_NATIVE" : data?.requiresApproval ? "BLOCKED_NO_EXECUTOR" : "MC_NATIVE");
  const assistantReply = data?.assistantReply || data?.replyMarkdown || data?.summary || data?.reply?.text || "";
  const conversationMode = data?.conversationMode || (createdJobs.length ? "routed" : data?.needsClarification ? "clarify" : "assistant-first");
  const routingDecision = data?.routingDecision || data?.intent || null;
  const statusSummary = data?.statusSummary || data?.summary || assistantReply || "";
  return {
    ...data,
    createdJobs,
    jobId,
    packetId: jobId,
    packetLink: departmentLink,
    workflowRecordLink: data?.workflowRecordLink || workflowLink,
    workflowLink,
    departmentLink,
    assignedDepartmentHead,
    assignedAgent,
    executionMode,
    approvalRequired: data?.requiresApproval,
    assistantReply,
    conversationMode,
    routingDecision,
    statusSummary,
    suggestedNextSteps: Array.isArray(data?.suggestedNextSteps) ? data.suggestedNextSteps : Array.isArray(data?.recommendedActions) ? data.recommendedActions : [],
  };
}

export default function Nettie() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [localThreadMessages, setLocalThreadMessages] = useState(() => loadLocalThread());
  const [lastResult, setLastResult] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedMode, setSelectedMode] = useState("MC_NATIVE");

  const { data: executorStatus, isError: executorStatusError, error: executorStatusErrorDetail } = useQuery({
    queryKey: ["nettie", "executor-status"],
    queryFn: api.executorStatus,
    refetchInterval: 10000,
  });

  const { data: runtimeState, isError: runtimeStateError, error: runtimeStateErrorDetail } = useQuery({
    queryKey: ["nettie", "runtime-state"],
    queryFn: api.runtimeState,
    refetchInterval: 10000,
  });

  const { data: packets, isError: packetsError, error: packetsErrorDetail } = useQuery({
    queryKey: ["nettie", "packets"],
    queryFn: api.packets,
    refetchInterval: 10000,
  });

  const { data: recentConversations, isError: recentConversationsError, error: recentConversationsErrorDetail } = useQuery({
    queryKey: ["nettie", "recent-conversations"],
    queryFn: api.nettieConversationsRecent,
    refetchInterval: 10000,
  });

  const { data: chatHistory, isError: chatHistoryError, error: chatHistoryErrorDetail } = useQuery({
    queryKey: ["nettie", "chat-history"],
    queryFn: api.chatHistory,
    refetchInterval: 10000,
  });

  const recentItems = useMemo(() => (Array.isArray(recentConversations) ? recentConversations.map(parseRecentConversation) : []), [recentConversations]);
  const serverThreadMessages = useMemo(() => {
    const ordered = Array.isArray(chatHistory) ? [...chatHistory].reverse() : [];
    return ordered.map(toChatMessage);
  }, [chatHistory]);
  const liveThreadMessages = useMemo(() => {
    const merged = [...serverThreadMessages, ...localThreadMessages].filter(Boolean);
    const deduped = [];
    const seen = new Set();
    for (const msg of merged) {
      const key = msg.id || `${msg.from || 'Nettie'}:${msg.ts || ''}:${msg.text || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(msg);
    }
    return deduped.slice(-50);
  }, [serverThreadMessages, localThreadMessages]);
  const activeConversation = useMemo(() => {
    if (!recentItems.length) return null;
    return recentItems.find((item) => item.id === activeConversationId) || recentItems[0] || null;
  }, [activeConversationId, recentItems]);
  const nettieTruth = useMemo(() => deriveNettieTruth({
    runtimeState,
    executorStatus,
    packets,
    chatHistory,
    recentConversations,
    runtimeStateErrorDetail,
    executorStatusErrorDetail,
    packetsErrorDetail,
    chatHistoryErrorDetail,
    recentConversationsErrorDetail,
  }), [runtimeState, executorStatus, packets, chatHistory, recentConversations, runtimeStateError, executorStatusError, packetsError, chatHistoryError, recentConversationsError, runtimeStateErrorDetail, executorStatusErrorDetail, packetsErrorDetail, chatHistoryErrorDetail, recentConversationsErrorDetail]);

  useEffect(() => {
    persistLocalThread(localThreadMessages);
  }, [localThreadMessages]);

  useEffect(() => {
    if (!activeConversationId && recentItems[0]?.id) {
      setActiveConversationId(recentItems[0].id);
    }
  }, [activeConversationId, recentItems]);

  const sendMutation = useMutation({
    mutationFn: (text) => api.nettieCommand(text, { route: "/nettie", surface: "command-center", selectedMode }),
    onSuccess: async (data) => {
      const normalized = normalizeNettieResult(data);
      setLastResult(normalized);
      setMessage("");
      const liveMessages = Array.isArray(normalized?.messages) ? normalized.messages : [];
      if (liveMessages.length) {
        setLocalThreadMessages((current) => {
          const next = [...current, ...liveMessages.map(toChatMessage)];
          return next.slice(-50);
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nettie", "recent-conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["nettie", "chat-history"] }),
        queryClient.invalidateQueries({ queryKey: ["nettie", "runtime-state"] }),
        queryClient.invalidateQueries({ queryKey: ["nettie", "packets"] }),
      ]);
      if (normalized?.workflowLink) {
        setActiveConversationId(normalized.id || normalized.jobId || normalized.createdJobs?.[0]?.jobId || activeConversationId);
      }
    },
  });

  const currentJob = lastResult?.createdJobs?.[0] || (lastResult?.jobId ? { jobId: lastResult.jobId, id: lastResult.packetId || lastResult.jobId, owner: lastResult.assignedAgent || lastResult.assignedDepartmentHead || null, status: "queued" } : null);
  const routedOwner = lastResult?.assignedDepartmentHead || currentJob?.owner || null;
  const routedAgent = lastResult?.assignedAgent || currentJob?.owner || null;
  const routedWorkflowLink = lastResult?.workflowLink || (routedOwner ? `/departments/${String(routedOwner).toLowerCase()}/agents/${String(routedAgent || routedOwner).toLowerCase()}` : null);
  const routedDepartmentLink = lastResult?.departmentLink || (routedOwner ? `/departments/${String(routedOwner).toLowerCase()}` : null);
  const executionMode = lastResult?.executionMode || (currentJob ? "MC_NATIVE" : executorStatus?.executorCoolingDown ? "BLOCKED_NO_EXECUTOR" : "MC_NATIVE");
  const statusLabel = sendMutation.isPending ? "Sending" : sendMutation.isError ? "Blocked" : currentJob ? "Delivered" : "Ready";
  const composerHint = lastResult?.assistantReply?.split("\n").find(Boolean) || "Send a message to Nettie.";

  return (
    <div className="flex h-[calc(100vh-76px)] min-h-0 gap-3 overflow-hidden">
      <aside className="hidden w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 lg:flex">
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/80">Nettie</p>
              <p className="text-[10px] text-white/30">Command center</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge variant={nettieTruth.variant} dot>
              {nettieTruth.label}
            </StatusBadge>
            <StatusBadge variant={sendMutation.isPending ? "warning" : currentJob ? "active" : "idle"} dot>
              {statusLabel}
            </StatusBadge>
          </div>
          <p className="mt-2 text-[10px] text-white/30">{nettieTruth.detail}</p>
        </div>

        <div className="border-b border-white/[0.06] p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/30">Project history</div>
          <div className="space-y-1.5">
            {recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveConversationId(item.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${activeConversation?.id === item.id ? "border-white/14 bg-white/08" : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] font-medium text-white/75">{item.subject}</p>
                  <span className="text-[9px] text-white/24">{item.time}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/35">{item.preview || "No summary available."}</p>
              </button>
            ))}
            {!recentItems.length && <p className="text-[10px] text-white/25">No recent conversations yet.</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/30">Execution modes</div>
          <div className="space-y-2">
            <GlassCard className="p-3">
              <p className="text-[10px] text-white/30">Default mode</p>
              <p className="mt-1 text-[12px] font-semibold text-white/75">MC_NATIVE</p>
            </GlassCard>
            <GlassCard className="p-3">
              <p className="text-[10px] text-white/30">Fallback</p>
              <p className="mt-1 text-[12px] font-semibold text-white/75">HERMES_FALLBACK</p>
            </GlassCard>
            <GlassCard className="p-3">
              <p className="text-[10px] text-white/30">Blocked</p>
              <p className="mt-1 text-[12px] font-semibold text-white/75">BLOCKED_NO_EXECUTOR</p>
            </GlassCard>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/30">Command center</p>
            <h1 className="mt-1 text-[16px] font-semibold text-white/80">Nettie</h1>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-white/35">
              Route commands through Mission Control, create work packets, assign departments and agents, and show the execution record instead of a decorative dashboard.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <StatusBadge variant={nettieTruth.variant}>
              {nettieTruth.label}
            </StatusBadge>
            <p className="text-[10px] text-white/30">
              {executorStatus?.selectedExecutor || "codex"} · {executorStatus?.hermesUsed ? "Hermes used" : "Hermes not used"} · {executorStatus?.fallbackReason || executorStatus?.fallback?.detail || "no fallback reason"}
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-w-0 flex-col border-r border-white/[0.06]">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {liveThreadMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {!liveThreadMessages.length && (
                  <GlassCard className="p-4">
                    <p className="text-[12px] text-white/55">No live thread yet.</p>
                    <p className="mt-1 text-[10px] text-white/30">Send a message and Nettie will reply in the chat thread.</p>
                  </GlassCard>
                )}
                {lastResult?.assistantReply && currentJob && (
                  <GlassCard className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Assistant reply details</p>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-white/78">{lastResult.assistantReply}</p>
                    <div className="mt-3 grid gap-2 text-[10px] text-white/35 md:grid-cols-2">
                      <div>Conversation mode: {lastResult.conversationMode || "assistant-first"}</div>
                      <div>Routing decision: {lastResult.routingDecision || "—"}</div>
                      <div>Packet ID: {lastResult.packetId || "—"}</div>
                      <div>Status summary: {lastResult.statusSummary || "—"}</div>
                    </div>
                  </GlassCard>
                )}
                <div className="h-2" />
              </div>
            </div>

            <div className="border-t border-white/[0.06] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ActionPill label="Attach" disabled onClick={() => {}} />
                <ActionPill label={`Mode: ${selectedMode}`} active />
                <ActionPill label="MC_NATIVE" active={selectedMode === "MC_NATIVE"} onClick={() => setSelectedMode("MC_NATIVE")} />
                <ActionPill label="HERMES_FALLBACK" active={selectedMode === "HERMES_FALLBACK"} onClick={() => setSelectedMode("HERMES_FALLBACK")} />
                <ActionPill label="BLOCKED_NO_EXECUTOR" active={selectedMode === "BLOCKED_NO_EXECUTOR"} onClick={() => setSelectedMode("BLOCKED_NO_EXECUTOR")} />
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a command to Nettie…"
                  className="min-h-[88px] w-full resize-none bg-transparent text-[12px] text-white/80 placeholder:text-white/25 focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/45" disabled>
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach placeholder
                    </button>
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/45" disabled>
                      <Sparkles className="h-3.5 w-3.5" />
                      Model selector placeholder
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => message.trim() && sendMutation.mutate(message.trim())}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-2 text-[11px] font-semibold text-blue-200 transition-colors hover:bg-blue-500/22 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sendMutation.isPending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col overflow-hidden bg-white/[0.01]">
            <div className="border-b border-white/[0.06] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/25">{currentJob ? 'Routing record' : 'Assistant context'}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/60">{currentJob ? composerHint : (lastResult?.assistantReply || 'Nettie is ready for conversation.')}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {currentJob ? (
                <GlassCard className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Packet card</p>
                      <h3 className="mt-1 text-[13px] font-semibold text-white/75">{currentJob.task || currentJob.title}</h3>
                    </div>
                    <StatusBadge variant="active" dot>Packet routed</StatusBadge>
                  </div>
                  <div className="grid gap-2 text-[10px] text-white/35">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                      <p className="uppercase tracking-wider text-white/20">Owner</p>
                      <p className="mt-1 text-white/65">{routedOwner || "Nettie"}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                      <p className="uppercase tracking-wider text-white/20">Status</p>
                      <p className="mt-1 text-white/65">{currentJob.status || "queued"}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                      <p className="uppercase tracking-wider text-white/20">Workflow</p>
                      <Link to={routedWorkflowLink || "#"} className="mt-1 inline-flex items-center gap-1 text-blue-300 hover:text-blue-200">
                        Open workflow <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-2 text-[10px] text-white/35 md:grid-cols-2">
                    <div>Packet ID: {currentJob.jobId || currentJob.id || "—"}</div>
                    <div>Department link: {routedDepartmentLink || "—"}</div>
                    <div>Execution mode: {executionMode}</div>
                    <div>Packet status: {currentJob.routeStatus || currentJob.status || "queued"}</div>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-4">
                  <p className="text-[12px] text-white/55">No active execution.</p>
                  <p className="mt-1 text-[10px] text-white/30">Assistant-first chat stays visible in the main thread; routing metadata appears only when a task is actually routed.</p>
                </GlassCard>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
