import { useQuery } from "@tanstack/react-query";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { DollarSign, Zap, AlertTriangle, Cpu } from "lucide-react";

function valueOrUnavailable(value, fallback = 'Unavailable') {
  return value ?? fallback;
}

export default function BurnDashboard() {
  const { data } = useQuery({
    queryKey: ['system', 'costs'],
    queryFn: api.costs,
    refetchInterval: 30000,
  });

  const summary = data?.summary || {};
  const burnRate = data?.burnRate || {};
  const cooldown = data?.cooldown || {};
  const activeModelUsage = data?.activeModelUsage || {};
  const costByDepartment = data?.costByDepartment || [];
  const modelAssignmentMatrix = data?.modelAssignmentMatrix || [];
  const apiKeyTracking = data?.apiKeyTracking || [];
  const warning = data?.dashboardWarning || null;

  const topCards = [
    {
      label: 'Session Usage',
      value: valueOrUnavailable(summary.currentSessionTokenEstimate),
      sub: `${valueOrUnavailable(summary.percentUsed)}% used · ${valueOrUnavailable(summary.tokensRemaining)} tokens remaining`,
      variant: warning?.level === 'critical' ? 'critical' : 'active',
      badge: summary.confidence || 'unknown',
    },
    {
      label: 'Burn Rate',
      value: `${valueOrUnavailable(burnRate.tokensPerMinute)} / min`,
      sub: `${valueOrUnavailable(burnRate.tokensPerHour)} / hour`,
      variant: warning ? 'warning' : 'info',
      badge: burnRate.rollingSessionAverage || 'Unavailable',
    },
    {
      label: 'Time Remaining',
      value: valueOrUnavailable(burnRate.estimatedTimeUntilCap),
      sub: `Elapsed ${valueOrUnavailable(summary.elapsedMinutes)} minutes`,
      variant: warning ? 'warning' : 'active',
      badge: cooldown.cooldownStatus || 'no cooldown',
    },
    {
      label: 'Active Model',
      value: valueOrUnavailable(summary.activeModel),
      sub: `${valueOrUnavailable(summary.activeProvider)} · ${valueOrUnavailable(summary.activeModelVersion)}`,
      variant: cooldown.cooldownStatus === 'cooldown' ? 'critical' : 'info',
      badge: activeModelUsage.currentBurnStatus || 'normal',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {topCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4 border border-white/[0.06]">
            <p className="text-[8px] text-white/20 uppercase tracking-widest font-mono mb-2">{card.label}</p>
            <p className="text-[16px] font-bold font-mono text-white/80 leading-tight mb-1 break-words">{card.value}</p>
            <p className="text-[8px] text-white/20 mb-2">{card.sub}</p>
            <StatusBadge variant={card.variant} dot={false}>{card.badge}</StatusBadge>
          </motion.div>
        ))}
      </div>

      {warning ? (
        <GlassCard delay={0.08}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80" />
            <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">High Burn Warning</h3>
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed">{warning.message}</p>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.12}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
            <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">Current Session Burn</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              ['Model', summary.activeModel],
              ['Token Cap', summary.tokenCap],
              ['Tokens Used', summary.tokensUsed],
              ['Tokens Remaining', summary.tokensRemaining],
              ['Rolling 5m', burnRate.rollingFiveMinute],
              ['Rolling 15m', burnRate.rollingFifteenMinute],
              ['Session Avg', burnRate.rollingSessionAverage],
              ['Source', summary.source],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                <p className="text-[8px] text-white/20 uppercase tracking-wider">{label}</p>
                <p className="text-[11px] text-white/60 mt-1 break-words">{valueOrUnavailable(value)}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard delay={0.16}>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-blue-400/70" />
            <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">Cooldown / Fallback</h3>
          </div>
          <div className="space-y-2.5">
            {[
              ['Provider', cooldown.provider],
              ['Model', cooldown.model],
              ['Status', cooldown.cooldownStatus],
              ['Reset ETA', cooldown.estimatedResetTime],
              ['Retry Delay Seconds', cooldown.retryDelaySeconds],
              ['Provider Reset Seconds', cooldown.providerQuotaResetSeconds],
              ['Fallback Attempted', cooldown.fallbackAttempted ? 'yes' : 'no'],
              ['Fallback Result', cooldown.fallbackResult],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-2 last:border-b-0">
                <span className="text-[10px] text-white/30">{label}</span>
                <span className="text-[10px] text-white/60 font-mono text-right">{valueOrUnavailable(value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.2}>
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono mb-3">Cost by Department</h3>
          <div className="space-y-2.5">
            {costByDepartment.map((entry) => (
              <div key={entry.department} className="rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-white/50 font-semibold">{entry.department}</span>
                  <StatusBadge variant={entry.trackingStatus === 'estimated' ? 'warning' : entry.trackingStatus === 'actual' ? 'active' : 'idle'} dot={false}>{entry.trackingStatus}</StatusBadge>
                </div>
                <div className="mt-1 text-[9px] text-white/30">Model: {entry.model || 'unknown'} · Tokens: {valueOrUnavailable(entry.tokens)}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard delay={0.24}>
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono mb-3">Model Assignment Matrix</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {modelAssignmentMatrix.map((entry) => (
              <div key={`${entry.department}-${entry.agent}`} className="rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-white/55 font-semibold">{entry.agent}</span>
                  <span className="text-[8px] text-white/25 uppercase">{entry.costTier}</span>
                </div>
                <div className="mt-1 text-[9px] text-white/30">Default: {entry.defaultModel} · Fallback: {entry.fallbackModel}</div>
                <div className="mt-1 text-[9px] text-white/25">{entry.taskOverride}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.28}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400/70" />
          <h3 className="text-[10px] font-semibold text-white/35 uppercase tracking-widest font-mono">Future API-Key Cost Tracking</h3>
        </div>
        <div className="space-y-2">
          {apiKeyTracking.map((entry) => (
            <div key={entry.alias} className="rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/55 font-semibold">{entry.alias}</span>
                <span className="text-[8px] text-white/25 uppercase">{entry.provider}</span>
              </div>
              <div className="mt-1 text-[9px] text-white/30">Requests: {entry.requestCount} · Total Tokens: {entry.totalTokens}</div>
              <div className="mt-1 text-[9px] text-white/25">{entry.notes}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
