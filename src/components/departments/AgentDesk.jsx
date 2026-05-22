import { Link } from 'react-router-dom'
import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'

function sourceVariant(sourceLabel = 'UNAVAILABLE') {
  const value = String(sourceLabel || '').toUpperCase()
  if (value === 'LIVE') return 'active'
  if (value === 'REGISTRY-BACKED') return 'info'
  if (value === 'SEEDED') return 'warning'
  return 'idle'
}

export default function AgentDesk({
  agent,
  role,
  manager = null,
  department = null,
  sourceLabel = 'UNAVAILABLE',
  status = 'idle',
  currentWork = 'Idle',
  to = null,
}) {
  const card = (
    <GlassCard className="border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-white/82">{agent}</p>
          {role ? <p className="mt-0.5 text-[10px] text-white/30">{role}</p> : null}
          {department ? <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/22">{department}</p> : null}
          {manager ? <p className="mt-0.5 text-[9px] text-white/22">Manager: {manager}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge variant={status === 'blocked' || status === 'failed' ? 'critical' : status === 'review' ? 'review' : 'idle'}>{status || 'idle'}</StatusBadge>
          <StatusBadge variant={sourceVariant(sourceLabel)}>{sourceLabel}</StatusBadge>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <p className="text-[8px] uppercase tracking-wider text-white/20">Current work</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/65">{currentWork}</p>
      </div>
    </GlassCard>
  )

  return to ? (
    <Link
      to={to}
      className="block rounded-3xl transition-transform hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
    >
      {card}
    </Link>
  ) : card
}
