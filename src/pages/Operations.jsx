import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, RotateCcw, AlertTriangle, User, Flag, Clock,
  ChevronRight, X, ArrowUpRight, Zap
} from "lucide-react";
import BuildLogs from "../components/mission-control/BuildLogs";

const tabs = [
  { id: "lifecycle", label: "Lifecycle Board" },
  { id: "tasks", label: "Tasks", count: 18 },
  { id: "workload", label: "Workload" },
  { id: "pipeline", label: "Pipeline" },
  { id: "builds", label: "Build Logs" },
];

const stages = [
  { id: "INTAKE", label: "Intake", items: [
    { title: "API Performance Audit", owner: "Within Core", priority: "high", dept: "Security" },
    { title: "Newsletter Copy Review", owner: "Sam", priority: "medium", dept: "Growth" },
  ]},
  { id: "SCOPED", label: "Scoped", items: [
    { title: "Client Portal v2", owner: "Perry", priority: "high", dept: "Dev" },
    { title: "Content Calendar Q2", owner: "Sam", priority: "low", dept: "Growth" },
  ]},
  { id: "IN_PROGRESS", label: "In Progress", items: [
    { title: "Demo.ai Frontend", owner: "Perry", priority: "high", dept: "Dev" },
    { title: "GTM Playbook v2", owner: "Sam", priority: "medium", dept: "Growth" },
    { title: "Market Intelligence Report", owner: "Ivy", priority: "low", dept: "Intel" },
    { title: "Rate Limit Fix", owner: "Nexus", priority: "high", dept: "Systems" },
  ]},
  { id: "EXEC_QA", label: "Exec QA", items: [
    { title: "Security Audit Report", owner: "Within Core", priority: "medium", dept: "Security" },
    { title: "Market Trends Q1", owner: "Ivy", priority: "low", dept: "Intel" },
  ]},
  { id: "PERRY_QA", label: "Perry QA", items: [
    { title: "Deployment Package", owner: "Perry", priority: "high", dept: "Dev" },
  ]},
  { id: "NETTIE_QA", label: "Nettie QA", items: [
    { title: "Growth Strategy Deck", owner: "Sam", priority: "medium", dept: "Growth" },
    { title: "MeeshgCat Launch Copy", owner: "Sam", priority: "medium", dept: "Growth" },
  ]},
  { id: "APPROVAL", label: "Approval", items: [
    { title: "Demo.ai Website Launch", owner: "Perry", priority: "high", dept: "Dev" },
    { title: "Q2 Budget Allocation", owner: "Nettie", priority: "high", dept: "Ops" },
  ]},
];

const tasks = [
  { title: "Implement auth flow for Demo.ai", owner: "Perry", dept: "Development", priority: "high", stage: "IN_PROGRESS", due: "Today", source: "Mission: Demo.ai", blocker: null, progress: 80, subtasks: 4, done: 3 },
  { title: "Competitor pricing analysis", owner: "Sam", dept: "Growth", priority: "medium", stage: "IN_PROGRESS", due: "Tomorrow", source: "Mission: GTM Q2", blocker: null, progress: 55, subtasks: 3, done: 2 },
  { title: "Review API rate limiting config", owner: "Within Core", dept: "Security", priority: "high", stage: "EXEC_QA", due: "Today", source: "Escalation", blocker: "Awaiting prod access", progress: 100, subtasks: 2, done: 2 },
  { title: "Index market trend data batch 7", owner: "Ivy", dept: "Intelligence", priority: "low", stage: "IN_PROGRESS", due: "Apr 10", source: "Recurring", blocker: null, progress: 40, subtasks: 5, done: 2 },
  { title: "Update deployment pipeline docs", owner: "Nexus", dept: "Systems", priority: "medium", stage: "SCOPED", due: "Apr 12", source: "Internal", blocker: null, progress: 10, subtasks: 2, done: 0 },
  { title: "Security audit final sign-off", owner: "Within Core", dept: "Security", priority: "high", stage: "NETTIE_QA", due: "Apr 8", source: "Mission: Security Audit", blocker: null, progress: 95, subtasks: 3, done: 3 },
];

const priorityVariant = { high: "critical", medium: "warning", low: "info" };

const workloadDepts = [
  { name: "Perry", dept: "Development", load: 89, tasks: 15, blocked: 1, color: "emerald" },
  { name: "Within Core", dept: "Security", load: 62, tasks: 6, blocked: 0, color: "blue" },
  { name: "Ivy", dept: "Intelligence", load: 74, tasks: 8, blocked: 2, color: "amber" },
  { name: "Sam", dept: "Growth", load: 45, tasks: 4, blocked: 0, color: "purple" },
  { name: "Nexus", dept: "Systems", load: 55, tasks: 9, blocked: 0, color: "cyan" },
  { name: "Nettie", dept: "Orchestration", load: 71, tasks: 24, blocked: 0, color: "blue" },
];

const pipelineItems = [
  { name: "Demo.ai v2.4", type: "Build", stage: "ready", dept: "Perry" },
  { name: "GTM Strategy", type: "Deliverable", stage: "qa", dept: "Sam" },
  { name: "AI Workforce Thread", type: "Content", stage: "scheduled", dept: "Sam" },
  { name: "MeeshgCat Landing", type: "Build", stage: "active", dept: "Perry" },
  { name: "Security Audit", type: "Report", stage: "qa", dept: "Within Core" },
  { name: "Market Intel Q1", type: "Report", stage: "active", dept: "Ivy" },
  { name: "Rate Limit Fix", type: "Hotfix", stage: "active", dept: "Nexus" },
  { name: "Client Portal v2", type: "Build", stage: "scoped", dept: "Perry" },
  { name: "Newsletter Draft", type: "Content", stage: "failed", dept: "Sam" },
];

const pipelineStageColors = {
  intake: "bg-white/[0.05] text-white/30",
  scoped: "bg-blue-500/15 text-blue-300",
  active: "bg-cyan-500/15 text-cyan-300",
  qa: "bg-purple-500/15 text-purple-300",
  ready: "bg-amber-500/15 text-amber-300",
  scheduled: "bg-emerald-500/15 text-emerald-300",
  shipped: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/15 text-red-300",
};

function normalizeJob(job) {
  return {
    id: job.id,
    title: job.title ?? job.name ?? "Untitled job",
    owner: job.owner ?? job.assignee ?? job.agent ?? "Unassigned",
    dept: job.dept ?? job.department ?? "—",
    priority: job.priority ?? "medium",
    stage: job.stage ?? job.status ?? "INTAKE",
    due: job.due ?? job.dueDate ?? "Unscheduled",
    source: job.source ?? job.missionName ?? job.description ?? "—",
    blocker: job.blocker ?? job.blockedReason ?? null,
    progress: typeof job.progress === "number" ? job.progress : (job.percentComplete ?? 0),
    subtasks: job.subtasks ?? job.totalSubtasks ?? job.taskCount ?? 0,
    done: job.done ?? job.completedSubtasks ?? 0,
    raw: job,
  };
}

function TaskRow({ task, onClick }) {
  return (
    <div onClick={onClick} className="flex items-start gap-3 p-3 rounded-xl glass-card border border-white/[0.04] hover:border-white/[0.08] cursor-pointer transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-[12px] text-white/70 font-medium">{task.title}</p>
          <StatusBadge variant={priorityVariant[task.priority]} dot={false}>{task.priority}</StatusBadge>
          <StageBadge stage={task.stage} />
        </div>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="flex items-center gap-1 text-[9px] text-white/25"><User className="w-3 h-3" />{task.owner}</span>
          <span className="flex items-center gap-1 text-[9px] text-white/25"><Flag className="w-3 h-3" />{task.dept}</span>
          <span className="flex items-center gap-1 text-[9px] text-white/25"><Clock className="w-3 h-3" />{task.due}</span>
          <span className="text-[9px] text-white/15">{task.source}</span>
        </div>
        {task.blocker && (
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-amber-400/70">{task.blocker}</span>
          </div>
        )}
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/50 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
          </div>
          <span className="text-[8px] text-white/20 font-mono">{task.done}/{task.subtasks}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/20 hover:text-emerald-400 transition-colors">
          <CheckCircle className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
          <XCircle className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-white/20 hover:text-amber-400 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-white/20 hover:text-blue-400 transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TaskDetail({ task, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 glass-card border-l border-white/[0.06] overflow-y-auto"
      style={{ top: "44px" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <StageBadge stage={task.stage} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25"><X className="w-4 h-4" /></button>
        </div>
        <h2 className="text-[15px] font-semibold text-white/80 mb-4">{task.title}</h2>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[["Owner", task.owner], ["Department", task.dept], ["Priority", task.priority], ["Due", task.due], ["Source", task.source], ["Progress", `${task.progress}%`]].map(([k, v], i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02]">
              <p className="text-[8px] text-white/20 uppercase mb-1">{k}</p>
              <p className="text-[11px] text-white/55 font-medium">{v}</p>
            </div>
          ))}
        </div>
        {/* Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] text-white/25 uppercase tracking-wider">Progress</p>
            <span className="text-[9px] text-white/30 font-mono">{task.done}/{task.subtasks} subtasks</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
        {task.blocker && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-5">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-amber-400/80 font-medium mb-0.5">Blocker</p>
              <p className="text-[11px] text-amber-400/60">{task.blocker}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />Approve
          </button>
          <button className="flex-1 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-medium hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />Return
          </button>
          <button className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Operations() {
  const [activeTab, setActiveTab] = useState("lifecycle");
  const [selectedTask, setSelectedTask] = useState(null);

  const {
    data: rawJobs,
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: ["operations", "jobs"],
    queryFn: api.jobs,
    placeholderData: tasks,
    refetchInterval: 10000,
  });

  const liveTasks = Array.isArray(rawJobs) ? rawJobs.map(normalizeJob) : tasks;

  // Derive lifecycle columns from live data; fall back to static stage items if API failed
  const liveStages = stages.map((stage) => ({
    ...stage,
    items: jobsError
      ? stage.items
      : liveTasks.filter((t) => t.stage === stage.id),
  }));

  // Mutation exists but not yet connected to buttons — target stage mapping unclear
  // Wire when stage transition schema is confirmed with backend
  const transitionJobMutation = useMutation({
    mutationFn: ({ id, stage }) => api.transitionJob(id, stage),
  });

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-white/80">Operations</h1>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${jobsLoading ? "bg-amber-500" : jobsError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-[9px] text-white/20 font-mono">
              {jobsLoading ? "Loading" : jobsError ? "Data offline" : "Live"}
            </span>
          </span>
        </div>
        <p className="text-[11px] text-white/30">Execution layer — lifecycle board, task tracking, workload, pipeline</p>
      </div>
      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "lifecycle" && (
          <motion.div key="lifecycle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {liveStages.map((stage, si) => (
                <div key={stage.id} className="min-w-[200px] w-[200px] shrink-0">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <StageBadge stage={stage.id} />
                    <span className="text-[9px] text-white/20 font-mono ml-auto">{stage.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stage.items.map((item, i) => (
                      <GlassCard key={i} hover delay={si * 0.03 + i * 0.02} className="p-3 cursor-pointer" onClick={() => setSelectedTask({ ...item, stage: stage.id, due: "Today", source: "Mission", progress: 60, subtasks: 3, done: 2, blocker: null })}>
                        <p className="text-[11px] text-white/65 font-medium mb-1.5">{item.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/25">{item.owner}</span>
                          <StatusBadge variant={priorityVariant[item.priority]} dot={false}>{item.priority}</StatusBadge>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "tasks" && (
          <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {liveTasks.map((task, i) => (
                <TaskRow key={task.id ?? i} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "workload" && (
          <motion.div key="workload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-3">
              {workloadDepts.map((dept, i) => {
                const isOverloaded = dept.load > 80;
                const isAtRisk = dept.load > 70;
                return (
                  <GlassCard key={i} delay={i * 0.04} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-28 shrink-0">
                        <p className="text-[12px] font-semibold text-white/70">{dept.name}</p>
                        <p className="text-[9px] text-white/25">{dept.dept}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-white/25">Capacity</span>
                          <span className={`text-[10px] font-bold font-mono ${isOverloaded ? "text-red-400" : isAtRisk ? "text-amber-400" : "text-emerald-400"}`}>
                            {dept.load}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${dept.load}%` }}
                            transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${isOverloaded ? "bg-red-500/60" : isAtRisk ? "bg-amber-500/60" : "bg-emerald-500/50"}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <p className="text-[13px] font-bold text-white/60 font-mono">{dept.tasks}</p>
                          <p className="text-[7px] text-white/20 uppercase">Tasks</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[13px] font-bold font-mono ${dept.blocked > 0 ? "text-amber-400" : "text-white/30"}`}>{dept.blocked}</p>
                          <p className="text-[7px] text-white/20 uppercase">Blocked</p>
                        </div>
                        {isOverloaded && <StatusBadge variant="critical" dot={true}>Overloaded</StatusBadge>}
                        {isAtRisk && !isOverloaded && <StatusBadge variant="warning" dot={true}>At Risk</StatusBadge>}
                        {!isAtRisk && <StatusBadge variant="active" dot={true}>Healthy</StatusBadge>}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "pipeline" && (
          <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
              {["intake", "scoped", "active", "qa", "ready", "scheduled", "shipped", "failed"].map((s, i) => (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <span className={`px-2 py-1 rounded text-[9px] font-semibold uppercase ${pipelineStageColors[s]}`}>{s}</span>
                  {i < 7 && <ChevronRight className="w-3 h-3 text-white/10" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pipelineItems.map((item, i) => (
                <GlassCard key={i} hover delay={i * 0.03} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-white/30">{item.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase ${pipelineStageColors[item.stage]}`}>{item.stage}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-white/65 mb-1">{item.name}</p>
                  <p className="text-[9px] text-white/25">{item.dept}</p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "builds" && (
          <motion.div key="builds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BuildLogs />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
      </AnimatePresence>
    </div>
  );
}
