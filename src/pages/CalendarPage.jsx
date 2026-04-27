import { useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { StageBadge } from "../components/mission-control/LifecycleStage";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Calendar, Filter,
  Flag, AlertTriangle, User, CheckSquare, BarChart2, List, Grid
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TODAY_KEY = "2026-04-08";

const EVENTS = {
  "2026-04-07": [
    { id: 1, title: "Daily Standup", type: "standup", time: "9:00 AM", dept: "All", color: "blue", duration: "30m" },
    { id: 2, title: "AI Workforce Thread Publish", type: "content", time: "9:30 AM", dept: "Torina", color: "purple", duration: "—" },
  ],
  "2026-04-08": [
    { id: 3, title: "Demo.ai Sprint Review", type: "review", time: "10:30 AM", dept: "Van", color: "orange", duration: "1h" },
    { id: 4, title: "Security Audit Deadline", type: "deadline", time: "12:00 PM", dept: "Perry", color: "red", duration: "—" },
    { id: 5, title: "Q2 Budget Decision", type: "deadline", time: "5:00 PM", dept: "Dana", color: "red", duration: "—" },
    { id: 6, title: "GTM Strategy Presentation", type: "milestone", time: "2:00 PM", dept: "Torina", color: "amber", duration: "45m" },
    { id: 7, title: "Nettie Daily Wrap-Up", type: "standup", time: "5:30 PM", dept: "Nettie", color: "blue", duration: "20m" },
  ],
  "2026-04-09": [
    { id: 8, title: "MeeshgCat Launch Announcement", type: "content", time: "10:00 AM", dept: "Torina", color: "purple", duration: "—" },
    { id: 9, title: "MeeshgCat QA Review", type: "review", time: "11:00 AM", dept: "Van", color: "orange", duration: "1h" },
    { id: 10, title: "Market Intel Batch 7 Auto-Run", type: "automation", time: "2:00 AM", dept: "Funboy", color: "emerald", duration: "—" },
  ],
  "2026-04-10": [
    { id: 11, title: "Client Onboarding Review", type: "milestone", time: "1:00 PM", dept: "Icky", color: "amber", duration: "1h" },
    { id: 12, title: "Q2 Department Kickoffs", type: "standup", time: "9:00 AM", dept: "All", color: "blue", duration: "1h" },
  ],
  "2026-04-11": [
    { id: 13, title: "Weekly Recap Post", type: "content", time: "4:00 PM", dept: "Torina", color: "purple", duration: "—" },
    { id: 14, title: "End-of-Week Wrap-Up", type: "standup", time: "5:30 PM", dept: "Nettie", color: "blue", duration: "20m" },
  ],
  "2026-04-14": [
    { id: 15, title: "Q2 Strategy Kickoff", type: "milestone", time: "9:00 AM", dept: "All", color: "amber", duration: "2h" },
    { id: 16, title: "Van Code Review Sprint", type: "review", time: "1:00 PM", dept: "Van", color: "orange", duration: "2h" },
  ],
  "2026-04-15": [
    { id: 17, title: "Market Intelligence Batch", type: "automation", time: "6:00 AM", dept: "Funboy", color: "emerald", duration: "—" },
    { id: 18, title: "Demo.ai Production Deploy", type: "milestone", time: "10:00 AM", dept: "Van", color: "amber", duration: "—" },
  ],
  "2026-04-22": [
    { id: 19, title: "Monthly Review", type: "milestone", time: "2:00 PM", dept: "Patrick", color: "amber", duration: "2h" },
  ],
};

// Manager tasks
const TASKS = [
  { id: 1, title: "Implement auth flow for Demo.ai", owner: "Forge", dept: "Van", priority: "high", due: "Today", stage: "IN_PROGRESS", progress: 80, subtasks: [{ label: "OAuth setup", done: true }, { label: "Session handling", done: true }, { label: "2FA module", done: false }], blocked: null },
  { id: 2, title: "Competitor pricing analysis", owner: "Scout", dept: "Funboy", priority: "medium", due: "Tomorrow", stage: "IN_PROGRESS", progress: 55, subtasks: [{ label: "Scrape pricing pages", done: true }, { label: "Normalize data", done: false }, { label: "Draft report", done: false }], blocked: null },
  { id: 3, title: "Review API rate limit config", owner: "Sentry", dept: "Perry", priority: "high", due: "Today", stage: "EXEC_QA", progress: 100, subtasks: [{ label: "Audit access logs", done: true }, { label: "Rate config review", done: true }], blocked: "Awaiting Perry sign-off" },
  { id: 4, title: "Market trend batch 7 index", owner: "Drift", dept: "Funboy", priority: "low", due: "Apr 10", stage: "IN_PROGRESS", progress: 40, subtasks: [{ label: "Fetch sources", done: true }, { label: "Parse & clean data", done: false }, { label: "Index records", done: false }, { label: "QA pass", done: false }], blocked: "2 stale sources" },
  { id: 5, title: "Security audit final sign-off", owner: "Lock", dept: "Perry", priority: "high", due: "Apr 8", stage: "NETTIE_QA", progress: 95, subtasks: [{ label: "Scope review", done: true }, { label: "Findings report", done: true }, { label: "Nettie review", done: false }], blocked: null },
  { id: 6, title: "MeeshgCat launch copy", owner: "Quill", dept: "Torina", priority: "medium", due: "Apr 8", stage: "NETTIE_QA", progress: 90, subtasks: [{ label: "Draft thread", done: true }, { label: "Brand review", done: true }, { label: "Final approval", done: false }], blocked: null },
];

const colorMap = {
  blue: "bg-blue-500/15 text-blue-300 border-l-2 border-blue-500",
  purple: "bg-purple-500/15 text-purple-300 border-l-2 border-purple-500",
  orange: "bg-orange-500/15 text-orange-300 border-l-2 border-orange-500",
  red: "bg-red-500/15 text-red-300 border-l-2 border-red-500",
  amber: "bg-amber-500/15 text-amber-300 border-l-2 border-amber-500",
  emerald: "bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500",
};

const typeLabel = { standup: "Standup", review: "Review", deadline: "Deadline", milestone: "Milestone", content: "Content", automation: "Auto" };
const priorityVariant = { high: "critical", medium: "warning", low: "info" };

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }
function fmtKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

function EventDetailDrawer({ event, onClose }) {
  if (!event) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-72 z-50 border-l border-white/[0.06] p-5 overflow-y-auto"
      style={{ top: "44px", background: "hsl(225 12% 7%)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[9px] px-2 py-1 rounded uppercase font-semibold ${colorMap[event.color]}`}>{typeLabel[event.type]}</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25"><X className="w-4 h-4" /></button>
      </div>
      <h2 className="text-[15px] font-bold text-white/80 mb-4">{event.title}</h2>
      <div className="space-y-2 mb-5">
        {[["Time", event.time], ["Duration", event.duration], ["Department", event.dept], ["Date", TODAY_KEY]].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
            <span className="text-[9px] text-white/25 uppercase">{k}</span>
            <span className="text-[11px] text-white/55 font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/20 transition-colors">Attend</button>
        <button className="flex-1 py-2 rounded-xl bg-white/[0.05] text-white/30 text-[10px] font-semibold hover:bg-white/[0.09] transition-colors">Reschedule</button>
      </div>
    </motion.div>
  );
}

function TaskDetailDrawer({ task, onClose }) {
  if (!task) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-80 z-50 border-l border-white/[0.06] p-5 overflow-y-auto"
      style={{ top: "44px", background: "hsl(225 12% 7%)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <StageBadge stage={task.stage} />
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25"><X className="w-4 h-4" /></button>
      </div>
      <h2 className="text-[14px] font-bold text-white/80 mb-4">{task.title}</h2>
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[9px] text-white/25 uppercase">Progress</span>
          <span className="text-[10px] font-bold font-mono text-white/50">{task.progress}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[["Owner", task.owner], ["Dept", task.dept], ["Priority", task.priority], ["Due", task.due]].map(([k, v]) => (
          <div key={k} className="p-2.5 rounded-xl bg-white/[0.02]">
            <p className="text-[8px] text-white/20 uppercase mb-0.5">{k}</p>
            <p className="text-[11px] text-white/55 font-medium">{v}</p>
          </div>
        ))}
      </div>
      {task.blocked && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-400/70">{task.blocked}</p>
        </div>
      )}
      <div className="mb-5">
        <p className="text-[9px] text-white/25 uppercase mb-2">Subtasks ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})</p>
        {task.subtasks.map((s, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.02] transition-colors">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${s.done ? "bg-emerald-500/30 border-emerald-500/40" : "border-white/[0.12]"}`}>
              {s.done && <span className="text-[7px] text-emerald-400">✓</span>}
            </div>
            <span className={`text-[10px] ${s.done ? "text-white/25 line-through" : "text-white/45"}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/20 transition-colors">Approve</button>
        <button className="flex-1 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-colors">Return</button>
        <button className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-colors">Block</button>
      </div>
    </motion.div>
  );
}

const tabs = [
  { id: "calendar", label: "Calendar" },
  { id: "tasks", label: "My Work" },
  { id: "team", label: "Team Tasks" },
];

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [calView, setCalView] = useState("month");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);
  const [selectedDay, setSelectedDay] = useState(TODAY_KEY);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const cells = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const agendaDays = Object.entries(EVENTS)
    .filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .sort(([a], [b]) => a.localeCompare(b));

  const filteredTasks = TASKS.filter(t => {
    if (taskFilter === "blocked") return !!t.blocked;
    if (taskFilter === "high") return t.priority === "high";
    if (taskFilter === "inprogress") return t.stage === "IN_PROGRESS";
    return true;
  }).sort((a, b) => {
    if (sortBy === "priority") return a.priority === "high" ? -1 : 1;
    if (sortBy === "owner") return a.owner.localeCompare(b.owner);
    if (sortBy === "dept") return a.dept.localeCompare(b.dept);
    return 0;
  });

  const deptGroups = filteredTasks.reduce((acc, t) => {
    acc[t.dept] = acc[t.dept] || [];
    acc[t.dept].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80">Calendar & Work</h1>
          <p className="text-[11px] text-white/30">Milestones, reviews, deadlines, content, automations, and task management</p>
        </div>
      </div>

      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">

        {/* ===== CALENDAR ===== */}
        {activeTab === "calendar" && (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30"><ChevronLeft className="w-4 h-4" /></button>
                <h2 className="text-[14px] font-bold text-white/70 w-36 text-center">{MONTHS[month]} {year}</h2>
                <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
                {["month", "week", "agenda"].map(v => (
                  <button key={v} onClick={() => setCalView(v)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${calView === v ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
                    {v}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {[["blue", "Standups"], ["amber", "Milestones"], ["red", "Deadlines"], ["purple", "Content"], ["emerald", "Auto"]].map(([c, l]) => (
                  <div key={c} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ background: { blue: "#3b82f680", amber: "#f59e0b80", red: "#ef444480", purple: "#a855f780", emerald: "#22c55e80" }[c] }} />
                    <span className="text-[8px] text-white/25">{l}</span>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-[10px] transition-colors">
                <Plus className="w-3 h-3" />Add
              </button>
            </div>

            {/* MONTH VIEW */}
            {calView === "month" && (
              <>
                <GlassCard className="p-0 overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-white/[0.05]">
                    {DAYS.map(d => <div key={d} className="py-2 text-center text-[9px] font-semibold text-white/25 uppercase tracking-wider">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} className="min-h-[88px] border-r border-b border-white/[0.03]" />;
                      const dateKey = fmtKey(year, month, day);
                      const dayEvents = EVENTS[dateKey] || [];
                      const isToday = dateKey === TODAY_KEY;
                      const isSelected = dateKey === selectedDay;
                      return (
                        <div key={i} onClick={() => setSelectedDay(dateKey)}
                          className={`min-h-[88px] border-r border-b border-white/[0.03] p-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-white/[0.035]" : ""} ${isToday ? "ring-1 ring-inset ring-blue-500/30" : ""}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mb-1 ${isToday ? "bg-blue-500 text-white" : "text-white/35"}`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(ev => (
                              <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                className={`text-[7px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${colorMap[ev.color]}`}>
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <div className="text-[7px] text-white/20 px-1">+{dayEvents.length - 3}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
                {/* Day detail */}
                {selectedDay && EVENTS[selectedDay]?.length > 0 && (
                  <GlassCard className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${selectedDay === TODAY_KEY ? "text-blue-400" : "text-white/40"}`}>
                        {selectedDay === TODAY_KEY ? "TODAY — " : ""}{selectedDay}
                      </p>
                      <button onClick={() => setSelectedDay(null)} className="text-white/20 hover:text-white/40"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="space-y-1.5">
                      {EVENTS[selectedDay].map(ev => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${colorMap[ev.color]}`}>
                          <span className="text-[9px] font-mono w-16 shrink-0 opacity-70">{ev.time}</span>
                          <p className="text-[11px] font-medium flex-1">{ev.title}</p>
                          <span className="text-[8px] opacity-60">{ev.dept}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10">{typeLabel[ev.type]}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </>
            )}

            {/* WEEK VIEW */}
            {calView === "week" && (
              <GlassCard className="p-0 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-white/[0.05]">
                  {["Mon Apr 6", "Tue Apr 7", "Wed Apr 8", "Thu Apr 9", "Fri Apr 10", "Sat Apr 11", "Sun Apr 12"].map((d, i) => (
                    <div key={i} className={`py-2 px-2 text-[9px] font-medium text-center ${d.includes("Apr 8") ? "text-blue-400" : "text-white/30"}`}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 min-h-[280px]">
                  {["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10", "2026-04-11", "2026-04-12"].map((dk, ci) => (
                    <div key={ci} className={`border-r border-white/[0.03] p-1.5 space-y-1 ${dk === TODAY_KEY ? "bg-blue-500/5" : ""}`}>
                      {(EVENTS[dk] || []).map(ev => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className={`text-[8px] px-1.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 ${colorMap[ev.color]}`}>
                          <p className="font-medium truncate">{ev.title}</p>
                          <p className="opacity-60 mt-0.5">{ev.time}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* AGENDA VIEW */}
            {calView === "agenda" && (
              <div className="space-y-3">
                {agendaDays.map(([dk, events]) => (
                  <GlassCard key={dk} className="p-3">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dk === TODAY_KEY ? "text-blue-400" : "text-white/30"}`}>
                      {dk === TODAY_KEY ? "TODAY — " : ""}{dk}
                    </p>
                    <div className="space-y-1">
                      {events.map(ev => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 ${colorMap[ev.color]}`}>
                          <span className="text-[9px] font-mono w-16 shrink-0 opacity-70">{ev.time}</span>
                          <p className="text-[11px] font-medium flex-1">{ev.title}</p>
                          <span className="text-[9px] opacity-60">{ev.dept}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== MY WORK ===== */}
        {activeTab === "tasks" && (
          <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-white/20" />
              {[["all", "All"], ["high", "High Priority"], ["blocked", "Blocked"], ["inprogress", "In Progress"]].map(([f, l]) => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${taskFilter === f ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50"}`}>
                  {l}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[9px] text-white/20">Sort:</span>
                {[["due", "Due"], ["priority", "Priority"], ["owner", "Owner"]].map(([s, l]) => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2 py-1 rounded text-[9px] transition-colors ${sortBy === s ? "bg-white/[0.07] text-white/60" : "text-white/20 hover:text-white/40"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Workload bar summary */}
            <GlassCard className="mb-3 p-3">
              <div className="flex items-center gap-4">
                {[["Total", filteredTasks.length, "text-white/50"], ["Blocked", filteredTasks.filter(t => t.blocked).length, "text-amber-400"], ["High Pri", filteredTasks.filter(t => t.priority === "high").length, "text-red-400"], ["In QA", filteredTasks.filter(t => t.stage.includes("QA")).length, "text-purple-400"]].map(([l, v, c]) => (
                  <div key={l} className="text-center">
                    <p className={`text-[18px] font-bold font-mono ${c}`}>{v}</p>
                    <p className="text-[8px] text-white/20 uppercase">{l}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
            <div className="space-y-2">
              {filteredTasks.map((task, i) => (
                <button key={task.id} onClick={() => setSelectedTask(task)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl glass-card border border-white/[0.04] hover:border-white/[0.09] transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[12px] text-white/70 font-semibold">{task.title}</p>
                      <StatusBadge variant={priorityVariant[task.priority]} dot={false}>{task.priority}</StatusBadge>
                      <StageBadge stage={task.stage} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[9px] text-white/25 mb-2">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.owner}</span>
                      <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{task.dept}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.due}</span>
                      <span>{task.subtasks.filter(s => s.done).length}/{task.subtasks.length} subtasks</span>
                    </div>
                    {task.blocked && (
                      <div className="flex items-center gap-1 mb-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] text-amber-400/70">{task.blocked}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-[8px] text-white/20 font-mono">{task.progress}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors mt-1 shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== TEAM VIEW ===== */}
        {activeTab === "team" && (
          <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              {Object.entries(deptGroups).map(([dept, tasks]) => (
                <GlassCard key={dept}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[11px] font-bold text-white/65">{dept}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30">{tasks.length} tasks</span>
                    {tasks.some(t => t.blocked) && <StatusBadge variant="warning" dot={true}>blocked</StatusBadge>}
                    <div className="ml-auto flex-1 max-w-24">
                      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/40 rounded-full" style={{ width: `${Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <button key={task.id} onClick={() => setSelectedTask(task)}
                        className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group border border-transparent hover:border-white/[0.06]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[11px] text-white/60 font-medium truncate">{task.title}</p>
                            <StageBadge stage={task.stage} />
                          </div>
                          <div className="flex items-center gap-2 text-[8px] text-white/20">
                            <span>{task.owner}</span>
                            <span>·</span>
                            <span>Due: {task.due}</span>
                            {task.blocked && <span className="text-amber-400">⚠ Blocked</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-white/30">{task.progress}%</span>
                          <StatusBadge variant={priorityVariant[task.priority]} dot={false}>{task.priority}</StatusBadge>
                        </div>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawers */}
      <AnimatePresence>
        {selectedEvent && <EventDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        {selectedTask && <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />}
      </AnimatePresence>
    </div>
  );
}