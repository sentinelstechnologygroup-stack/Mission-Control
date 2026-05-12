import { useQuery } from "@tanstack/react-query";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { api } from "@/lib/api";
import { DollarSign, TimerReset, TrendingUp, AlertTriangle } from "lucide-react";

function metricValue(value, fallback = 'Unavailable') {
  return value ?? fallback;
}

export default function CostPanel() {
  const { data } = useQuery({
    queryKey: ['home', 'costs'],
    queryFn: api.costs,
    refetchInterval: 30000,
  });

  const summary = data?.summary || {};
  const burnRate = data?.burnRate || {};
  const cooldown = data?.cooldown || {};
  const warning = data?.dashboardWarning || null;

  const metrics = [
    { label: 'Session Burn', value: metricValue(summary.currentSessionTokenEstimate), detail: `${metricValue(summary.percentUsed)}% used`, icon: DollarSign },
    { label: 'Rate / Min', value: burnRate.tokensPerMinute || 'Unavailable', detail: `${burnRate.tokensPerHour || 'Unavailable'} per hour`, icon: TrendingUp },
    { label: 'Time Remaining', value: burnRate.estimatedTimeUntilCap || 'Unavailable', detail: summary.confidence || 'unknown confidence', icon: TimerReset },
  ];

  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Cost Tracker</h3>
        <DollarSign className="w-3.5 h-3.5 text-white/20" />
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl bg-white/[0.02] px-3 py-2 border border-white/[0.04]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-white/35">{metric.label}</span>
                <Icon className="w-3 h-3 text-white/20" />
              </div>
              <div className="mt-1 text-[13px] font-semibold text-white/80 font-mono">{metric.value}</div>
              <div className="text-[8px] text-white/20 mt-1">{metric.detail}</div>
            </div>
          );
        })}

        <div className="rounded-xl bg-white/[0.02] px-3 py-2 border border-white/[0.04]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/35">Active Model</span>
            <StatusBadge variant={warning ? (warning.level === 'critical' ? 'critical' : 'warning') : 'active'} dot={false}>
              {cooldown.cooldownStatus || 'active'}
            </StatusBadge>
          </div>
          <div className="mt-1 text-[13px] font-semibold text-white/80 font-mono">{summary.activeModel || 'Unavailable'}</div>
          <div className="text-[8px] text-white/20 mt-1">{summary.activeProvider || 'unknown provider'} · {summary.activeModelVersion || 'unknown version'}</div>
        </div>

        {warning ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">{warning.title}</span>
            </div>
            <p className="text-[10px] text-white/45 leading-relaxed">{warning.message}</p>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
