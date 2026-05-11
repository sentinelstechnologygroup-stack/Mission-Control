import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Pin, CheckCircle, AlertTriangle, Target, Zap,
  FileText, RotateCcw, ArrowUpRight, Clock, Paperclip, MoreHorizontal,
  Archive, ChevronRight, XCircle, Flag, Brain, Crown,
  Filter, Star, Inbox, MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";

// ===========================================================
// DATA
// ===========================================================
const THREADS = [
  {
    id: 1,
    subject: "Demo.ai Website — Ready for Production Deploy",
    preview: "All QA gates cleared. Perry signed off. Staging live.",
    time: "9:41 AM",
    age: "9m",
    unread: true,
    priority: "critical",
    linked: { type: "mission", label: "Demo.ai Platform", stage: "APPROVAL" },
    messages: [
      {
        from: "Nettie", time: "9:41 AM", role: "Chief of Staff",
        body: "Patrick —\n\nDemo.ai website is ready for production. All three QA gates have cleared:\n  → Exec QA:  ✓ Van approved\n  → Perry QA: ✓ Sentry confirmed no vulnerabilities\n  → Nettie QA: ✓ Brand and copy reviewed\n\nStaging is live. Load test: 2,000 concurrent users. Performance score: 98/100. Perry has signed the release package.\n\nAwaiting your final authorization to push to production.",
        chips: [
          { label: "Approve Deploy", action: "approve", primary: true },
          { label: "Review Package", action: "view" },
          { label: "Return to Perry QA", action: "return" },
          { label: "Delay 24h", action: "delay" },
        ],
        linked: [
          { type: "approval", label: "Demo.ai Website Launch" },
          { type: "mission", label: "Demo.ai Platform" },
          { type: "artifact", label: "Deploy Package v2.4" },
        ],
      },
      {
        from: "Van", time: "9:38 AM", role: "CTO / Operations",
        body: "Deployment package v2.4 is finalized. Auth, API layer, and frontend all green. No open issues. Forge ran the full build suite — zero failures.\n\nReady on my end.",
        chips: [],
        linked: [{ type: "artifact", label: "Release Notes v2.4" }],
      },
    ],
  },
  {
    id: 2,
    subject: "Q2 Budget — Decision Required by EOD",
    preview: "Allocations ready. $840/mo savings identified. Net +$1,249.",
    time: "8:55 AM",
    age: "1h",
    unread: true,
    priority: "high",
    linked: { type: "task", label: "Q2 Budget Allocation", stage: "APPROVAL" },
    messages: [
      {
        from: "Nettie", time: "8:55 AM", role: "Chief of Staff",
        body: "Patrick —\n\nQ2 budget proposal is ready for your decision. Dana has finalized all department allocations. I've identified $840/mo in optimization savings through model routing consolidation.\n\nDepartment allocations (monthly):\n  Van  (Technology): $1,420\n  Perry (Security):  $580\n  Torina (Media):    $620\n  Dana  (Finance):   $340\n  Icky  (Admin):     $180\n  Funboy (Intel):    $270\n  Rab  (R&D):        $376\n\nTotal: $3,786 vs. $4,200 budget. Net margin: +$1,249.\n\nDeadline is end of day — department heads need finalized numbers to execute Q2 plans.",
        chips: [
          { label: "Approve Budget", action: "approve", primary: true },
          { label: "Request Changes", action: "return" },
          { label: "Schedule Review", action: "delay" },
          { label: "View Full Report", action: "view" },
        ],
        linked: [
          { type: "task", label: "Q2 Budget Allocation" },
          { type: "artifact", label: "Budget Report Q2" },
        ],
      },
    ],
  },
  {
    id: 3,
    subject: "Escalation Summary — 3 Items Require Your Action",
    preview: "Capacity risk, rate limits, and competitor signal need direction.",
    time: "7:32 AM",
    age: "2h",
    unread: false,
    priority: "high",
    linked: null,
    messages: [
      {
        from: "Nettie", time: "7:32 AM", role: "Chief of Staff",
        body: "Patrick —\n\nThree items have escalated and require your direction:\n\n1. Capacity Risk (Van — Technology)\n   Van is at 89% load. Client build timeline is slipping by 2 days. Options: authorize overtime allocation, or de-prioritize the internal tooling sprint.\n\n2. Database Rate Limits (Icky / Funboy)\n   Nexus hit 85% threshold overnight. Auto-scaling triggered. Root cause is still unresolved — Funboy is investigating pattern data.\n\n3. Competitor Signal (Funboy → Torina)\n   Funboy flagged a competitor product with early traction on Product Hunt. Torina has a GTM response drafted. Recommend you review before EOD.",
        chips: [
          { label: "Authorize Overtime", action: "approve", primary: true },
          { label: "Review GTM Response", action: "view" },
          { label: "Assign to Funboy", action: "assign" },
          { label: "Mark Reviewed", action: "dismiss" },
        ],
        linked: [
          { type: "task", label: "Van Capacity — Overtime Decision" },
          { type: "task", label: "Rate Limit Root Cause — Funboy" },
          { type: "mission", label: "GTM Q2 Response — Torina" },
        ],
      },
    ],
  },
  {
    id: 4,
    subject: "Daily Briefing — April 8, 2026",
    preview: "System health 94%. 24 jobs running. 2 awaiting approval.",
    time: "7:00 AM",
    age: "3h",
    unread: false,
    priority: "info",
    linked: null,
    messages: [
      {
        from: "Nettie", time: "7:00 AM", role: "Chief of Staff",
        body: "Good morning, Patrick.\n\nHere is your April 8 briefing.\n\nSystem Status: Operational. 24 active jobs, 7 in QA, 2 awaiting your approval.\n\nPriority Actions Today:\n  → Demo.ai website is ready — client is waiting\n  → Q2 budget decision required by EOD\n  → 3 escalations logged (see Escalation Summary thread)\n\nDepartment Health:\n  Van      89% load — monitor closely\n  Funboy   70% load — 2 alerts\n  Perry    62% — stable\n  Torina   55% — normal\n  Icky     48% — normal\n  Rab      35% — low\n  Dana     40% — stable\n\nCost: $128/day. Monthly: $3,786 vs $4,200 budget. On track.\n\nToday's approvals are time-sensitive.",
        chips: [
          { label: "See Approvals", action: "nav-approvals", primary: true },
          { label: "View Escalations", action: "view" },
          { label: "Review Missions", action: "nav-missions" },
          { label: "Acknowledge", action: "dismiss" },
        ],
        linked: [],
      },
    ],
  },
  {
    id: 5,
    subject: "MeeshgCat Launch Copy — QA Passed",
    preview: "Torina submitted launch copy. Quill and Polish signed off.",
    time: "6:15 AM",
    age: "4h",
    unread: false,
    priority: "info",
    linked: { type: "content", label: "MeeshgCat Launch Copy", stage: "NETTIE_QA" },
    messages: [
      {
        from: "Torina", time: "6:15 AM", role: "Chief Media Officer",
        body: "Patrick —\n\nMeeshgCat launch copy package is ready for your review. Quill produced the primary thread and announcement copy. Polish ran brand consistency review — approved. Signal has the distribution schedule ready.\n\nThe copy is strong. Recommend approval so Signal can queue for the April 9 publish window.",
        chips: [
          { label: "Approve Copy", action: "approve", primary: true },
          { label: "View in Content Studio", action: "view" },
          { label: "Return to Torina", action: "return" },
        ],
        linked: [
          { type: "content", label: "MeeshgCat Launch Copy" },
          { type: "artifact", label: "Brand Review — Polish" },
        ],
      },
    ],
  },
];

const COMMAND_HISTORY = [
  { cmd: "Build a landing page for the new product launch", time: "Yesterday 3:42 PM", result: "Routed to Van → Forge. Mission created." },
  { cmd: "Research competitor pricing for Q2 strategy", time: "Yesterday 11:20 AM", result: "Routed to Funboy → Scout. Report in progress." },
  { cmd: "Audit API security before next deployment", time: "Apr 7, 9:00 AM", result: "Routed to Perry → Sentry. Audit complete." },
  { cmd: "Generate GTM content for MeeshgCat launch", time: "Apr 6, 2:15 PM", result: "Routed to Torina → Quill. In NETTIE_QA." },
];

const QUICK_COMMANDS = [
  "Approve all pending items",
  "Show today's escalations",
  "Status of Demo.ai",
  "Assign GTM response to Torina",
  "Generate daily cost report",
  "Reschedule MeeshgCat to April 10",
];

const priorityVariant = { critical: "critical", high: "warning", info: "info", low: "idle" };
const linkedTypeIcon = { mission: "🎯", task: "⚡", approval: "✅", artifact: "📄", content: "✍️" };

// Single source of truth for message shape — used for history, optimistic, and reply messages
function toThreadMessage(m) {
  const text = m.body ?? m.text ?? m.content ?? "";
  return {
    id: m.id ?? String(Date.now()),
    from: m.from ?? m.sender ?? "Nettie",
    role: m.role ?? (m.from === "Patrick" ? "Operator" : "Orchestrator"),
    time: m.time ?? (
      m.ts
        ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    ),
    body: text,
    text,
    chips: m.chips ?? [],
    linked: m.linked ?? [],
    _optimistic: m._optimistic ?? false,
    failed: m.failed ?? false,
  };
}

// Converts backend flat message array → single THREADS-compatible thread object
const OPERATOR_EMPTY_THREAD = [{
  id: "live-chat",
  subject: "Nettie — Live Command Console",
  preview: "Awaiting first operator message",
  time: "—",
  age: "live",
  unread: false,
  priority: "info",
  linked: null,
  messages: [],
}];

function normalizeChatHistory(flatMessages) {
  if (!Array.isArray(flatMessages) || flatMessages.length === 0) return null;
  const chronological = [...flatMessages].reverse();
  const messages = chronological.map(toThreadMessage);
  const latest = flatMessages[0];
  const latestNettie = flatMessages.find(m => m.from === "Nettie");
  return [{
    id: "live-chat",
    subject: "Nettie — Live Command Console",
    preview: latestNettie?.text?.split("\n")[0].slice(0, 80) ?? "Awaiting first message",
    time: latest?.ts
      ? new Date(latest.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—",
    age: "live",
    unread: false,
    priority: "info",
    linked: null,
    messages,
  }];
}

const GENERIC_PROCESSING_FALLBACK = "Nettie: Command received. Processing now.";
const NETTIE_OPERATOR_THREAD_KEY = "mission-control-nettie-operator-thread";
const DIAGNOSTIC_TEXT_PATTERNS = [
  /master work registry/i,
  /validation/i,
  /backend is healthy/i,
  /command bridge/i,
  /ledger summary/i,
  /worker status/i,
  /system diagnostic/i,
  /curl\b/i,
  /\btest accepted\b/i,
  /\bhermes\b.*\b(execution|internal|runtime|bridge|worker|trace|log)\b/i,
  /\bbackend\b.*\b(log|status|trace|debug|health|test)\b/i,
  /\b(system|internal|debug|diagnostic|validation|health)\b.*\b(log|entry|record|trace|status)\b/i,
  /\b(stack trace|exception|recovery ledger|ledger event|raw event)\b/i,
];
const OPERATOR_ALLOWED_KINDS = new Set(["command", "pending", "nettie_async", "ack", "briefing", "status", "job", "system", "outage", "approval"]);
const OPERATOR_BLOCKED_SOURCES = new Set(["system", "diagnostic", "validation", "worker", "ledger", "hermes-internal", "backend", "test", "health", "debug", "trace", "router", "scheduler"]);

function loadTrackedOperatorThread() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NETTIE_OPERATOR_THREAD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrackedOperatorThread(entries) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NETTIE_OPERATOR_THREAD_KEY, JSON.stringify(entries.slice(-25)));
}

function isOperatorVisibleChatMessage(message) {
  if (!message || typeof message !== "object") return false;

  const channel = message.channel;
  const kind = String(message.kind || "").toLowerCase();
  const from = String(message.from || message.sender || "");
  const source = String(message.source || "").toLowerCase();
  const text = String(message.text || "");

  const operatorChannel = !channel || channel === "mission-control";
  const operatorActor = from === "Patrick" || from === "Nettie";
  const allowedKind = OPERATOR_ALLOWED_KINDS.has(kind);
  const blockedSource = OPERATOR_BLOCKED_SOURCES.has(source);
  const blockedText = DIAGNOSTIC_TEXT_PATTERNS.some((pattern) => pattern.test(text));

  return operatorChannel && operatorActor && allowedKind && !blockedSource && !blockedText;
}

function reconcileTrackedOperatorThread(history, trackedEntries) {
  if (!Array.isArray(trackedEntries) || trackedEntries.length === 0) return trackedEntries ?? [];

  return trackedEntries.map((entry) => {
    if (entry.commandId) return entry;

    const sentAt = entry.sentAt ? Date.parse(entry.sentAt) : Number.NaN;
    const matchedCommand = Array.isArray(history)
      ? history.find((message) => {
          if (message?.from !== "Patrick" || message?.kind !== "command") return false;
          if ((message?.channel || "mission-control") !== "mission-control") return false;
          if (String(message?.text || "").trim() !== String(entry.commandText || "").trim()) return false;
          if (Number.isNaN(sentAt)) return true;
          const deltaMs = Math.abs(Date.parse(message.ts || 0) - sentAt);
          return Number.isFinite(deltaMs) && deltaMs <= 120000;
        })
      : null;

    return matchedCommand ? { ...entry, commandId: matchedCommand.id } : entry;
  });
}

function collectTrackedMessageIds(trackedEntries) {
  return new Set(
    (trackedEntries || []).flatMap((entry) => [entry.commandId, entry.replyId]).filter(Boolean)
  );
}

function formatContextSummary(summary, nextActionHint) {
  if (!summary && !nextActionHint) return "";

  const summaryLines = summary && typeof summary === "object"
    ? Object.entries(summary)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `${key}: ${value}`)
    : [];

  return [...summaryLines, nextActionHint].filter(Boolean).join("\n");
}

function extractCanonicalReply(data) {
  const text = data?.reply?.text
    ?? data?.reply?.message
    ?? data?.message
    ?? data?.text
    ?? formatContextSummary(data?.job?.contextSummary, data?.job?.nextActionHint)
    ?? GENERIC_PROCESSING_FALLBACK;

  return {
    id: data?.reply?.id,
    from: data?.reply?.from ?? "Nettie",
    role: data?.reply?.role ?? "Executive Assistant",
    kind: data?.reply?.kind ?? "ack",
    channel: data?.reply?.channel ?? "mission-control",
    text,
    ts: data?.reply?.ts ?? new Date().toISOString(),
    jobId: data?.reply?.jobId ?? data?.jobId ?? data?.job?.jobId ?? null,
    workerId: data?.reply?.workerId ?? data?.worker?.id ?? null,
  };
}

function hasResolvedReply(message) {
  if (!message) return false;
  return message.kind !== "pending" || message.text !== GENERIC_PROCESSING_FALLBACK;
}

function getDeliveryFailureText(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("auth")) return "Not delivered - Codex auth error";
  if (message.includes("codex")) return "Not delivered - Codex executor unavailable";
  if (message.includes("hermes")) return "Not delivered - legacy Hermes unavailable";
  if (message.includes("executor")) return "Not delivered - no executor available";
  return "Not delivered - send failed";
}

// ===========================================================
// COMPONENTS
// ===========================================================

function CommandTraceBar() {
  const steps = [
    { label: "Patrick", icon: "👤", desc: "Issues command" },
    { label: "Nettie", icon: "🧠", desc: "Routes & decomposes" },
    { label: "Executive", icon: "⚡", desc: "Department head" },
    { label: "Tasks", icon: "📋", desc: "Execution queue" },
    { label: "QA Gates", icon: "🔍", desc: "Quality review" },
    { label: "Approval", icon: "✅", desc: "Patrick decides" },
  ];
  return (
    <div className="flex items-center gap-0 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2 overflow-x-auto mb-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="text-[11px]">{s.icon}</span>
            <div>
              <p className="text-[9px] font-semibold text-white/50">{s.label}</p>
              <p className="text-[7px] text-white/20">{s.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-white/10 mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

function ThreadMessage({ msg }) {
  const isNettie = msg.from === "Nettie";
  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${isNettie ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.06] text-white/50"}`}>
        {msg.from[0]}
      </div>
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-white/70">{msg.from}</span>
          <span className="text-[9px] text-white/25 bg-white/[0.03] px-1.5 py-0.5 rounded">{msg.role}</span>
          <span className="text-[9px] text-white/20 font-mono ml-auto">{msg.time}</span>
        </div>

        {/* Body — styled as executive memo, not chat bubble */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 mb-3">
          <p className="text-[11px] text-white/55 leading-relaxed whitespace-pre-line font-mono">{msg.body || msg.text || msg.content}</p>
        </div>

        {/* Linked context chips */}
        {msg.linked?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span className="text-[8px] text-white/15 uppercase tracking-wider">Linked:</span>
            {msg.linked.map((l, i) => (
              <button key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-[9px] text-white/40 hover:text-white/65 hover:bg-white/[0.07] cursor-pointer transition-colors">
                <span>{linkedTypeIcon[l.type]}</span>
                {l.label}
                <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        )}

        {/* Action chips */}
        {msg.chips?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {msg.chips.map((chip, i) => (
              <button key={i} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                chip.primary
                  ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
                  : chip.action === "return"
                    ? "bg-amber-500/10 border-amber-500/15 text-amber-400/80 hover:bg-amber-500/20"
                  : chip.action === "dismiss"
                    ? "bg-white/[0.04] border-white/[0.06] text-white/25 hover:text-white/45"
                    : "bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white/65 hover:bg-white/[0.07]"
              }`}>
                {chip.primary && <span className="mr-1">→</span>}{chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================
// MAIN PAGE
// ===========================================================
export default function Nettie() {
  const queryClient = useQueryClient();
  const [activeThread, setActiveThread] = useState(THREADS[0]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("threads"); // threads | history
  const [localMessages, setLocalMessages] = useState([]);
  const [pendingReplyId, setPendingReplyId] = useState(null);
  const [trackedOperatorThread, setTrackedOperatorThread] = useState(() => loadTrackedOperatorThread());
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const {
    data: rawHistory,
    isLoading: chatLoading,
    isError: chatError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["nettie", "history"],
    queryFn: api.chatHistory,
    placeholderData: THREADS,
    refetchInterval: 10000,
  });

  useEffect(() => {
    saveTrackedOperatorThread(trackedOperatorThread);
  }, [trackedOperatorThread]);

  const reconciledTrackedThread = Array.isArray(rawHistory)
    ? reconcileTrackedOperatorThread(rawHistory, trackedOperatorThread)
    : trackedOperatorThread;

  useEffect(() => {
    const current = JSON.stringify(trackedOperatorThread);
    const reconciled = JSON.stringify(reconciledTrackedThread);
    if (current !== reconciled) {
      setTrackedOperatorThread(reconciledTrackedThread);
    }
  }, [reconciledTrackedThread, trackedOperatorThread]);

  const trackedMessageIds = collectTrackedMessageIds(reconciledTrackedThread);
  const operatorVisibleHistory = !chatError && Array.isArray(rawHistory)
    ? rawHistory.filter((message) => trackedMessageIds.has(message.id) && isOperatorVisibleChatMessage(message))
    : null;

  // API returns flat { from, text, ts } messages — normalize only the operator-visible subset; fall back to static
  const normalized = !chatError && Array.isArray(operatorVisibleHistory) && operatorVisibleHistory[0]?.from
    ? normalizeChatHistory(operatorVisibleHistory)
    : null;
  const liveThreads = normalized ?? ((trackedMessageIds.size > 0 || localMessages.length > 0) ? OPERATOR_EMPTY_THREAD : THREADS);

  // Derive currentThread fresh from liveThreads each render — never stale
  const currentThread = liveThreads.find(t => t.id === activeThread?.id) ?? liveThreads[0];

  // Auto-select live-chat thread once API data first arrives
  useEffect(() => {
    if (liveThreads[0]?.id === "live-chat" && activeThread?.id !== "live-chat") {
      setActiveThread(liveThreads[0]);
    }
  }, [liveThreads[0]?.id]);

  useEffect(() => {
    if (!pendingReplyId) return undefined;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      attempts += 1;

      try {
        const history = await queryClient.fetchQuery({
          queryKey: ["nettie", "history"],
          queryFn: api.chatHistory,
        });

        if (cancelled || !Array.isArray(history)) return;

        const resolved = history.find((message) => message.id === pendingReplyId);
        if (hasResolvedReply(resolved) || attempts >= maxAttempts) {
          setPendingReplyId(null);
          return;
        }

        window.setTimeout(() => {
          void poll();
        }, 1000);
      } catch (error) {
        console.error("NETTIE_HISTORY_POLL_ERROR", error);
        setPendingReplyId(null);
      }
    };

    const timerId = window.setTimeout(() => {
      void poll();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [pendingReplyId, queryClient]);

  const sendChatMutation = useMutation({
    mutationFn: (message) => api.sendChat(message),
    onSuccess: (data) => {
      console.log("NETTIE_ON_SUCCESS_RAW", data);
      const serverReply = extractCanonicalReply(data);
      setLocalMessages(prev => {
        const withoutOptimistic = prev.filter(m => !m._optimistic);
        const next = serverReply
          ? [...withoutOptimistic, toThreadMessage(serverReply)]
          : withoutOptimistic;
        console.log("NETTIE_ON_SUCCESS_NEXT_LOCAL", next);
        return next;
      });

      if (serverReply?.id && !hasResolvedReply(serverReply)) {
        setPendingReplyId(serverReply.id);
      } else {
        setPendingReplyId(null);
      }

      if (serverReply?.id) {
        setTrackedOperatorThread(prev => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (!next[i]?.replyId) {
              next[i] = { ...next[i], replyId: serverReply.id };
              break;
            }
          }
          return next.slice(-25);
        });
      }

      refetchHistory();
    },
    onError: (error) => {
      setPendingReplyId(null);
      setLocalMessages(prev =>
        prev.map(m => m._optimistic ? { ...m, failed: true, failureText: getDeliveryFailureText(error) } : m)
      );
    },
  });

  const handleSend = () => {
    if (!reply?.trim()) return;
    const cleanReply = reply.trim();
    const sentAt = new Date().toISOString();
    const optimistic = toThreadMessage({
      id: `optimistic-${Date.now()}`,
      from: "Patrick",
      role: "Operator",
      body: cleanReply,
      _optimistic: true,
    });
    console.log("NETTIE_HANDLE_SEND", optimistic);
    setLocalMessages(prev => [...prev, optimistic]);
    setTrackedOperatorThread(prev => ([
      ...prev,
      {
        sentAt,
        commandText: cleanReply,
        commandId: null,
        replyId: null,
      },
    ].slice(-25)));
    sendChatMutation.mutate(cleanReply);
    setReply("");
  };

  // Inline dedup: filter localMessages that already exist in live history — no useEffect needed
  const liveIds = new Set((currentThread?.messages ?? []).map(m => m.id));
  const displayMessages = [
    ...(currentThread?.messages ?? []),
    ...localMessages.filter(m => !liveIds.has(m.id)),
  ].map(toThreadMessage);

  console.log("NETTIE_RENDER_PROOF", {
    localMessages,
    displayMessages,
    displayMessagesCount: displayMessages.length,
    lastMsg: displayMessages.at(-1),
    isPending: sendChatMutation.isPending,
  });

  // Auto-scroll to bottom whenever messages change or send is in flight
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayMessages.length, sendChatMutation.isPending]);

  const filtered = liveThreads.filter(t => {
    if (filter === "unread") return t.unread;
    if (filter === "critical") return t.priority === "critical" || t.priority === "high";
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-76px)] gap-3">

      {/* ===== LEFT SIDEBAR ===== */}
      <div className="w-64 shrink-0 flex flex-col gap-0 border border-white/[0.06] rounded-2xl overflow-hidden" style={{ background: "hsl(225 12% 7%)" }}>

        {/* Nettie identity header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white/80">Nettie</p>
              <p className="text-[8px] text-white/30 font-mono">Chief of Staff · Online</p>
            </div>
            <StatusBadge variant="active" dot={true} className="ml-auto">Live</StatusBadge>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            <button onClick={() => setView("threads")}
              className={`flex-1 py-1 rounded-md text-[9px] font-medium transition-colors ${view === "threads" ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
              Threads
            </button>
            <button onClick={() => setView("history")}
              className={`flex-1 py-1 rounded-md text-[9px] font-medium transition-colors ${view === "history" ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
              History
            </button>
          </div>
        </div>

        {/* Filter row */}
        {view === "threads" && (
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/[0.04]">
            {[["all", "All"], ["unread", "Unread"], ["critical", "Urgent"]].map(([f, l]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1 rounded text-[8px] font-medium uppercase tracking-wider transition-colors ${filter === f ? "bg-white/[0.07] text-white/65" : "text-white/20 hover:text-white/45"}`}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Thread list / history */}
        <div className="flex-1 overflow-y-auto">
          {view === "threads" ? (
            <div className="p-2 space-y-1">
              {filtered.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                    activeThread?.id === thread.id
                      ? "bg-white/[0.07] border-white/[0.10]"
                      : "border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${thread.unread ? "bg-blue-400" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-medium leading-snug mb-1 ${thread.unread ? "text-white/75" : "text-white/40"}`}>
                        {thread.subject}
                      </p>
                      <p className="text-[8px] text-white/20 truncate mb-1.5">{thread.preview}</p>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge variant={priorityVariant[thread.priority]} dot={false} className="text-[7px]">{thread.priority}</StatusBadge>
                        <span className="text-[7px] text-white/15 font-mono ml-auto">{thread.age} ago</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <p className="text-[8px] text-white/20 uppercase tracking-wider px-2 py-1.5">Recent Commands</p>
              {COMMAND_HISTORY.map((h, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <p className="text-[10px] text-white/55 font-mono leading-snug mb-1">"{h.cmd}"</p>
                  <p className="text-[8px] text-emerald-400/60">{h.result}</p>
                  <p className="text-[7px] text-white/15 mt-0.5 font-mono">{h.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System pulse */}
        <div className="border-t border-white/[0.05] px-4 py-3">
          <p className="text-[8px] text-white/20 uppercase tracking-wider mb-2">System Pulse</p>
          {[
            { label: "Active Jobs", value: "24", color: "text-emerald-400" },
            { label: "In QA", value: "7", color: "text-amber-400" },
            { label: "Awaiting Patrick", value: "2", color: "text-red-400" },
            { label: "Daily Spend", value: "$128", color: "text-white/40" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-white/25">{item.label}</span>
              <span className={`text-[9px] font-bold font-mono ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MAIN THREAD PANEL ===== */}
      <div className="flex-1 flex flex-col border border-white/[0.06] rounded-2xl overflow-hidden" style={{ background: "hsl(228 15% 5%)" }}>
        {currentThread ? (
          <>
            {/* Thread header — executive memo style */}
            <div className="px-5 py-3 border-b border-white/[0.05]" style={{ background: "hsl(225 12% 7%)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge variant={priorityVariant[currentThread.priority]} dot={true}>
                      {currentThread.priority}
                    </StatusBadge>
                    {currentThread.linked && (
                      <span className="flex items-center gap-1 text-[9px] text-white/25">
                        <span>{linkedTypeIcon[currentThread.linked.type]}</span>
                        {currentThread.linked.label}
                        {currentThread.linked.stage && <StageBadge stage={currentThread.linked.stage} className="ml-1" />}
                      </span>
                    )}
                    <span className="text-[8px] text-white/15 font-mono ml-auto">{currentThread.time}</span>
                  </div>
                  <h2 className="text-[14px] font-bold text-white/80">{currentThread.subject}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/20 transition-colors" title="Pin"><Pin className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/20 transition-colors" title="Archive"><Archive className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/20 transition-colors" title="More"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Command trace */}
              <CommandTraceBar />
            </div>

            {/* Messages — live history + optimistic local messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {displayMessages.map((msg, i) => (
                <div key={`${msg.id ?? 'msg'}-${msg.ts ?? msg.time ?? i}-${i}`}>
                  {i > 0 && <div className="border-t border-white/[0.04] mb-5" />}
                  <ThreadMessage msg={msg} />
                  {msg.failed && (
                    <p className="text-[9px] text-red-400/50 font-mono ml-10 -mt-2 mb-2">
                      {msg.failureText || "Not delivered - no executor available"}
                    </p>
                  )}
                  {msg._optimistic && !msg.failed && (
                    <p className="text-[9px] text-white/20 font-mono ml-10 -mt-2 mb-2">Waiting for Nettie…</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply / directive bar */}
            <div className="px-5 pb-4 pt-3 border-t border-white/[0.05]" style={{ background: "hsl(225 12% 7%)" }}>
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 mb-2">
                <Crown className="w-3.5 h-3.5 text-amber-400/50 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Issue a directive to Nettie..."
                  className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none font-mono"
                />
                <div className="flex items-center gap-1.5">
                  <button className="p-1 rounded-md hover:bg-white/[0.06] text-white/20 transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sendChatMutation.isPending}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${sendChatMutation.isPending ? "bg-blue-500/10 text-blue-400/40 cursor-not-allowed" : "bg-blue-500/15 hover:bg-blue-500/25 text-blue-400"}`}
                  >
                    <Send className="w-3 h-3" />
                    {sendChatMutation.isPending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
              {/* Quick directive chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[7px] text-white/15 uppercase tracking-wider font-semibold mr-1">Quick:</span>
                {QUICK_COMMANDS.map((cmd, i) => (
                  <button key={i} onClick={() => setReply(cmd)}
                    className="px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-[8px] text-white/25 hover:text-white/50 hover:bg-white/[0.05] transition-colors font-mono">
                    {cmd}
                  </button>
                ))}
                <span className="flex items-center gap-1 ml-auto shrink-0">
                  <span className={`w-1 h-1 rounded-full ${chatLoading ? "bg-amber-500" : chatError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[7px] text-white/15 font-mono">
                    {chatLoading ? "Loading" : chatError ? "History offline" : "Live"}
                  </span>
                  {sendChatMutation.isPending && <span className="text-[7px] text-blue-400/50 font-mono ml-1">· Sending…</span>}
                  {sendChatMutation.isError && <span className="text-[7px] text-red-400/50 font-mono ml-1">· {getDeliveryFailureText(sendChatMutation.error).replace(/^Not delivered - /, "")}</span>}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-[13px] text-white/25">Select a thread</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== RIGHT PANEL — Nettie's active context ===== */}
      <div className="w-56 shrink-0 hidden xl:flex flex-col gap-2">
        {/* Pending actions */}
        <GlassCard className="p-0 border border-white/[0.06]">
          <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Patrick's Queue</p>
          </div>
          <div className="p-2 space-y-1">
            {[
              { label: "Demo.ai Deploy", type: "approval", urgent: true },
              { label: "Q2 Budget", type: "approval", urgent: true },
              { label: "MeeshgCat Copy", type: "review", urgent: false },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-2 rounded-lg ${item.urgent ? "bg-amber-500/5 border border-amber-500/10" : "bg-white/[0.02]"} cursor-pointer hover:bg-white/[0.05] transition-colors`}>
                <span className="text-[10px]">{linkedTypeIcon[item.type]}</span>
                <p className="text-[9px] text-white/45 flex-1 truncate">{item.label}</p>
                {item.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Active routing */}
        <GlassCard className="p-0 border border-white/[0.06]">
          <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Active Routing</p>
          </div>
          <div className="p-2 space-y-1">
            {[
              { from: "Patrick", to: "Van", label: "Landing page build" },
              { from: "Funboy", to: "Torina", label: "Competitor GTM response" },
              { from: "Perry", to: "Nettie", label: "Rate limit escalation" },
            ].map((r, i) => (
              <div key={i} className="px-2 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[8px] text-white/30">{r.from}</span>
                  <ChevronRight className="w-2.5 h-2.5 text-white/15" />
                  <span className="text-[8px] text-blue-400/60">Nettie</span>
                  <ChevronRight className="w-2.5 h-2.5 text-white/15" />
                  <span className="text-[8px] text-white/35">{r.to}</span>
                </div>
                <p className="text-[8px] text-white/20 truncate">{r.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick links */}
        <GlassCard className="p-3">
          <p className="text-[9px] text-white/20 uppercase tracking-wider mb-2">Navigate</p>
          {[
            { label: "Approvals", path: "/approvals", icon: "✅" },
            { label: "Operations", path: "/operations", icon: "⚡" },
            { label: "Missions", path: "/missions", icon: "🎯" },
            { label: "System", path: "/system", icon: "⚙️" },
          ].map((l, i) => (
            <Link key={i} to={l.path}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors">
              <span className="text-[11px]">{l.icon}</span>
              <span className="text-[10px] text-white/35 hover:text-white/60">{l.label}</span>
              <ArrowUpRight className="w-2.5 h-2.5 text-white/10 ml-auto" />
            </Link>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
