import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Zap, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";

const DAILY_BURN = [
  { day: "Apr 1", actual: 108, budget: 133 },
  { day: "Apr 2", actual: 121, budget: 133 },
  { day: "Apr 3", actual: 97, budget: 133 },
  { day: "Apr 4", actual: 134, budget: 133 },
  { day: "Apr 5", actual: 118, budget: 133 },
  { day: "Apr 6", actual: 142, budget: 133 },
  { day: "Apr 7", actual: 125, budget: 133 },
  { day: "Apr 8", actual: 128, budget: 133 },
];

const DEPT_COST = [
  { name: "Van", cost: 1420, budget: 1600, pct: 89 },
  { name: "Perry", cost: 580, budget: 700, pct: 83 },
  { name: "Torina", cost: 620, budget: 700, pct: 89 },
  { name: "Dana", cost: 340, budget: 400, pct: 85 },
  { name: "Icky", cost: 180, budget: 250, pct: 72 },
  { name: "Funboy", cost: 270, budget: 300, pct: 90 },
  { name: "Rab", cost: 376, budget: 500, pct: 75 },
];

const MODEL_COST = [
  { name: "GPT-4o", cost: 1650, pct: 43.5, color: "#20c87a" },
  { name: "Claude 3.5", cost: 980, pct: 25.8, color: "#3b82f6" },
  { name: "Gemini 1.5", cost: 520, pct: 13.7, color: "#f59e0b" },
  { name: "GPT-4o-mini", cost: 420, pct: 11.1, color: "#a855f7" },
  { name: "Other", cost: 216, pct: 5.7, color: "#6b7280" },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card border border-white/[0.08] rounded-lg px-3 py-2 text-[10px]">
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || "rgba(255,255,255,0.6)" }} className="font-mono">
            {p.name}: ${p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BurnDashboard() {
  const totalActual = 3786;
  const totalBudget = 4200;
  const dailyAvg = 128;
  const budgetPct = Math.round((totalActual / totalBudget) * 100);
  const savingsVsBudget = totalBudget - totalActual;
  const projectedMonthly = dailyAvg * 30;

  return (
    <div className="space-y-4">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "MTD Spend", value: `$${totalActual.toLocaleString()}`, sub: `of $${totalBudget.toLocaleString()} budget`, color: "text-white/75", variant: "active", badge: `${budgetPct}% used` },
          { label: "Daily Avg", value: `$${dailyAvg}`, sub: "vs $133 budget/day", color: "text-cyan-400", variant: "info", badge: "On track" },
          { label: "Budget Remaining", value: `$${savingsVsBudget.toLocaleString()}`, sub: "this month", color: "text-emerald-400", variant: "active", badge: "Healthy" },
          { label: "Projected Month", value: `$${projectedMonthly.toLocaleString()}`, sub: "vs $4,200 cap", color: "text-amber-400", variant: "warning", badge: `${Math.round((projectedMonthly / 4200) * 100)}% of cap` },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4 border border-white/[0.06]">
            <p className="text-[8px] text-white/20 uppercase tracking-widest font-mono mb-2">{kpi.label}</p>
            <p className={`text-[22px] font-bold font-mono ${kpi.color} leading-none mb-1`}>{kpi.value}</p>
            <p className="text-[8px] text-white/20 mb-2">{kpi.sub}</p>
            <StatusBadge variant={kpi.variant} dot={false}>{kpi.badge}</StatusBadge>
          </motion.div>
        ))}
      </div>

      {/* Daily burn rate chart */}
      <GlassCard delay={0.1}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">Daily Burn Rate — April</h3>
          <div className="flex items-center gap-3">
            {[["#20c87a", "Actual"], ["rgba(255,255,255,0.12)", "Budget"]].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 text-[8px] text-white/25">
                <span className="w-2 h-1 rounded-full" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DAILY_BURN} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barGap={2}>
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <ReferenceLine y={133} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
              <Bar dataKey="budget" fill="rgba(255,255,255,0.06)" radius={[3, 3, 0, 0]} name="Budget" />
              <Bar dataKey="actual" fill="rgba(32,200,120,0.55)" radius={[3, 3, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dept cost table */}
        <GlassCard delay={0.15}>
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono mb-3">Spend by Department</h3>
          <div className="space-y-2.5">
            {DEPT_COST.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-white/50 font-semibold w-12 shrink-0">{d.name}</span>
                <div className="flex-1">
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${d.pct}%` }}
                      transition={{ delay: i * 0.04 + 0.2, duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${d.pct > 88 ? "bg-amber-500/60" : "bg-emerald-500/50"}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-mono text-white/40">${d.cost}</span>
                  <span className={`text-[8px] font-mono ${d.pct > 88 ? "text-amber-400" : "text-emerald-400"}`}>{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Model cost breakdown */}
        <GlassCard delay={0.2}>
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono mb-3">Model Cost Breakdown</h3>
          <div className="space-y-2">
            {MODEL_COST.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: m.color, opacity: 0.7 }} />
                <span className="text-[10px] text-white/45 flex-1">{m.name}</span>
                <div className="flex-1 max-w-[100px]">
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                      transition={{ delay: i * 0.05 + 0.25 }}
                      className="h-full rounded-full"
                      style={{ background: m.color, opacity: 0.6 }}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-white/35 w-12 text-right">${m.cost}</span>
                <span className="text-[8px] text-white/20 font-mono w-10 text-right">{m.pct}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Optimization recommendations */}
      <GlassCard delay={0.25}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-emerald-400/60" />
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">Optimization Signals</h3>
          <span className="ml-auto text-[8px] text-emerald-400/60 font-mono">~$840/mo savings identified</span>
        </div>
        <div className="space-y-1.5">
          {[
            { saving: "$45/mo", msg: "Switch Funboy batch indexing GPT-4o → GPT-4o-mini — minimal quality impact on classification tasks.", risk: "low" },
            { saving: "$220/mo", msg: "Consolidate Van's overnight workers — 12% compute reduction during 00:00–06:00 UTC.", risk: "low" },
            { saving: "$380/mo", msg: "Route Torina's first-pass drafts to Claude Haiku, reserve Sonnet for final polish only.", risk: "medium" },
            { saving: "$195/mo", msg: "Rab prototype runs can use Gemini Flash instead of GPT-4o — R&D tasks tolerate higher latency.", risk: "low" },
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors border border-white/[0.03]">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
              <p className="text-[10px] text-white/40 flex-1 leading-relaxed">{rec.msg}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono text-emerald-400 font-bold">{rec.saving}</span>
                <StatusBadge variant={rec.risk === "low" ? "active" : "warning"} dot={false}>{rec.risk}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}