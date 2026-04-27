import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, FileText, Database, Settings, AlertTriangle, CheckCircle,
  Clock, Cpu, RefreshCw, Play, Pause, Zap, ChevronRight, Plus, X, Edit3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import BurnDashboard from "../components/mission-control/BurnDashboard";

const tabs = [
  { id: "cost", label: "Cost / Usage" },
  { id: "automations", label: "Automations" },
  { id: "logs", label: "Logs" },
  { id: "state", label: "State" },
  { id: "settings", label: "Settings" },
];

const costByDept = [
  { name: "Perry", cost: 1420 },
  { name: "Core", cost: 580 },
  { name: "Ivy", cost: 620 },
  { name: "Sam", cost: 340 },
  { name: "Nexus", cost: 450 },
  { name: "Nettie", cost: 376 },
];

const costByModel = [
  { name: "GPT-4o", value: 1650, color: "#22c55e" },
  { name: "Claude 3.5", value: 980, color: "#3b82f6" },
  { name: "GPT-4o-mini", value: 420, color: "#a855f7" },
  { name: "Gemini 1.5", value: 520, color: "#f59e0b" },
  { name: "Other", value: 216, color: "#6b7280" },
];

const automations = [
  { id: 1, name: "Daily Nettie Briefing", trigger: "Scheduled 7:00 AM daily", dept: "Nettie", status: "active", lastRun: "7:00 AM today", nextRun: "7:00 AM tomorrow", runs: 142 },
  { id: 2, name: "Market Signal Indexer", trigger: "Every 6 hours", dept: "Ivy", status: "active", lastRun: "2h ago", nextRun: "4h from now", runs: 284 },
  { id: 3, name: "Pipeline Health Check", trigger: "Every 30 minutes", dept: "Nexus", status: "active", lastRun: "12m ago", nextRun: "18m from now", runs: 1842 },
  { id: 4, name: "Auto-Scale Trigger", trigger: "Load > 85%", dept: "Nexus", status: "active", lastRun: "2h ago (triggered)", nextRun: "On threshold", runs: 14 },
  { id: 5, name: "Security Anomaly Scan", trigger: "Every 1 hour", dept: "Within Core", status: "active", lastRun: "47m ago", nextRun: "13m from now", runs: 368 },
  { id: 6, name: "Social Publishing Bot", trigger: "Per schedule", dept: "Sam", status: "paused", lastRun: "1d ago", nextRun: "Paused", runs: 28 },
  { id: 7, name: "Approval Reminder", trigger: "Every 4h if pending", dept: "Nettie", status: "active", lastRun: "1h ago", nextRun: "3h from now", runs: 54 },
  { id: 8, name: "Weekly Wrap-Up Generator", trigger: "Friday 5:30 PM", dept: "Nettie", status: "active", lastRun: "Apr 5", nextRun: "Apr 12", runs: 8 },
];

const logs = [
  { time: "12:47", type: "success", msg: "Demo.ai frontend deployed to staging", dept: "Perry" },
  { time: "12:42", type: "info", msg: "Market trends batch 7 indexing started", dept: "Ivy" },
  { time: "12:38", type: "warning", msg: "Rate limit at 85% — auto-scaling triggered", dept: "Nexus" },
  { time: "12:30", type: "success", msg: "Security audit report generated", dept: "Within Core" },
  { time: "12:22", type: "info", msg: "Nettie completed pipeline health check", dept: "Nettie" },
  { time: "12:15", type: "error", msg: "Failed to fetch competitor pricing data (retry 2/3)", dept: "Ivy" },
  { time: "12:10", type: "success", msg: "GTM Playbook v2 submitted for review", dept: "Sam" },
  { time: "12:01", type: "info", msg: "Daily cost snapshot saved", dept: "System" },
];

const logColors = { success: "text-emerald-400", info: "text-blue-400", warning: "text-amber-400", error: "text-red-400" };

const stateItems = [
  { label: "Last State Snapshot", value: "Apr 8, 12:00 UTC" },
  { label: "Agent Registry", value: "12 agents registered" },
  { label: "Entity Count", value: "2,847 records" },
  { label: "Last Sync", value: "47 seconds ago" },
  { label: "Environment", value: "Production" },
  { label: "System Uptime", value: "99.97% (30d)" },
];

const settingsGroups = [
  { label: "Model Routing", items: [["Default Model", "GPT-4o"], ["Code Tasks", "Claude 3.5 Sonnet"], ["Fast Routing", "Claude 3 Haiku"], ["Long Context", "Gemini 1.5 Pro"]] },
  { label: "Thresholds", items: [["Max Daily Spend", "$200"], ["Rate Limit Alert", "80%"], ["Auto-Scale Trigger", "85%"], ["Max Concurrent Jobs", "50"]] },
  { label: "Alerting", items: [["Critical Alerts", "Slack + Email"], ["Warning Alerts", "Slack"], ["Daily Digest", "Email @ 18:00"]] },
];

function normalizeWorker(w) {
  return {
    id: w.id,
    name: w.name ?? "Unknown",
    trigger: w.trigger ?? w.schedule ?? "Not scheduled",
    dept: w.dept ?? w.department ?? "—",
    status: w.status ?? "unknown",
    lastRun: w.lastRun ?? w.updatedAt ?? "Unknown",
    nextRun: w.nextRun ?? "Unknown",
    runs: w.runs ?? w.runCount ?? 0,
  };
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card rounded-lg px-3 py-2 text-[10px]">
        <p className="text-white/60">{payload[0].payload.name}</p>
        <p className="text-white/80 font-mono">${payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function System() {
  const [activeTab, setActiveTab] = useState("cost");
  const [automationStates, setAutomationStates] = useState({});

  const {
    data: liveLogs = logs,
    isLoading: logsLoading,
    isError: logsError,
  } = useQuery({
    queryKey: ["system", "logs"],
    queryFn: api.logs,
    placeholderData: logs,
    refetchInterval: 10000,
  });

  const {
    data: rawWorkers,
    isLoading: automationsLoading,
    isError: automationsError,
  } = useQuery({
    queryKey: ["system", "automations"],
    queryFn: api.workers,
    placeholderData: automations,
    refetchInterval: 10000,
  });

  const liveAutomations = Array.isArray(rawWorkers)
    ? rawWorkers.map(normalizeWorker)
    : automations;

  const stopWorkerMutation = useMutation({
    mutationFn: (workerId) => api.stopWorker(workerId),
  });

  // currentlyActive: whether the item is active before this click
  // Pause → calls api.stopWorker (API-backed when backend is live)
  // Play  → local-only (no resume endpoint exists)
  const toggleAutomation = (id, currentlyActive) => {
    setAutomationStates(prev => ({ ...prev, [id]: !prev[id] }));
    if (currentlyActive && !automationsError) {
      stopWorkerMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-white/80 mb-1">System</h1>
        <p className="text-[11px] text-white/30">Cost, automations, logs, state, and configuration</p>
      </div>
      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "cost" && (
          <motion.div key="cost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BurnDashboard />
          </motion.div>
        )}

        {activeTab === "automations" && (
          <motion.div key="automations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-white/30">{liveAutomations.filter(a => a.status === "active").length} active · {liveAutomations.filter(a => a.status === "paused").length} paused</p>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${automationsLoading ? "bg-amber-500" : automationsError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[9px] text-white/20 font-mono">
                    {automationsLoading ? "Loading" : automationsError ? "Static fallback" : "Live"}
                  </span>
                </span>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-[10px] font-medium transition-colors">
                <Plus className="w-3 h-3" />New Automation
              </button>
            </div>
            <div className="space-y-2">
              {liveAutomations.map((auto) => {
                const isToggled = automationStates[auto.id];
                const isActive = isToggled !== undefined ? !isToggled : auto.status === "active";
                return (
                  <GlassCard key={auto.id} className="p-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[12px] text-white/65 font-semibold">{auto.name}</p>
                          <StatusBadge variant={isActive ? "active" : "idle"} dot={true}>
                            {isActive ? "active" : "paused"}
                          </StatusBadge>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[9px] text-white/25 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{auto.trigger}
                          </span>
                          <span className="text-[9px] text-white/20">{auto.dept}</span>
                          <span className="text-[9px] text-white/15">Last: {auto.lastRun}</span>
                          <span className="text-[9px] text-white/15">Next: {auto.nextRun}</span>
                          <span className="text-[9px] text-white/15">{auto.runs} runs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/20 transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleAutomation(auto.id, isActive)}
                          className={`p-1.5 rounded-lg transition-colors ${isActive ? "hover:bg-amber-500/10 text-amber-400/50 hover:text-amber-400" : "hover:bg-emerald-500/10 text-emerald-400/50 hover:text-emerald-400"}`}
                          title={isActive ? "Pause (API-backed when backend live)" : "Resume (local-only — no resume endpoint)"}
                        >
                          {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Event Log</h3>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${logsLoading ? "bg-amber-500" : logsError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[9px] text-white/25 font-mono">
                    {logsLoading ? "Loading" : logsError ? "Static fallback" : "Live"}
                  </span>
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {liveLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <span className="text-[10px] font-mono text-white/20 w-10 shrink-0">{log.time}</span>
                    <span className={`text-[10px] font-mono w-14 shrink-0 ${logColors[log.type]}`}>{log.type.toUpperCase()}</span>
                    <p className="text-[11px] text-white/45 flex-1">{log.msg}</p>
                    <span className="text-[9px] text-white/15 shrink-0">{log.dept}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "state" && (
          <motion.div key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stateItems.map((item, i) => (
                <GlassCard key={i} delay={i * 0.04} className="text-center">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">{item.label}</p>
                  <p className="text-[13px] text-white/70 font-medium font-mono">{item.value}</p>
                  <StatusBadge variant="active" className="mt-2" dot={true}>Healthy</StatusBadge>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              {settingsGroups.map((group, gi) => (
                <GlassCard key={gi} delay={gi * 0.05}>
                  <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">{group.label}</h3>
                  <div className="space-y-2">
                    {group.items.map(([key, val], i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors group">
                        <span className="text-[11px] text-white/40">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/60 font-medium font-mono">{val}</span>
                          <Edit3 className="w-3 h-3 text-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}