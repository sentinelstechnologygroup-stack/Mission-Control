import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'

function chipTone(active) {
  return active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] bg-white/[0.03] text-white/45'
}

export default function AgentDesk({
  agent,
  role,
  manager = null,
  department = null,
  sourceLabel = null,
  status = 'idle',
  skills = [],
  tools = [],
  currentWork = 'Idle',
  room = null,
  evidence = null,
  breakState = null,
  tone = 'idle',
}) {
  const isActive = ['running', 'active', 'healthy', 'ready', 'available', 'live'].includes(String(status || '').toLowerCase())
  const sourceTone = sourceLabel === 'LIVE' ? 'active' : sourceLabel === 'SEEDED' ? 'warning' : sourceLabel === 'STATIC' ? 'critical' : 'idle'

  return (
    <GlassCard className={`border p-4 ${tone === 'active' ? 'border-emerald-500/20 bg-emerald-500/6' : tone === 'critical' ? 'border-rose-500/20 bg-rose-500/6' : tone === 'warning' ? 'border-amber-500/20 bg-amber-500/6' : 'border-white/[0.06] bg-white/[0.03]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-white/82">{agent}</p>
          {role ? <p className="mt-0.5 text-[10px] text-white/30">{role}</p> : null}
          {department ? <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/20">{department}</p> : null}
          {manager ? <p className="mt-0.5 text-[9px] text-white/22">Manager: {manager}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge variant={isActive ? 'active' : status === 'blocked' || status === 'failed' ? 'critical' : status === 'review' ? 'review' : 'idle'}>{status || 'idle'}</StatusBadge>
          {sourceLabel ? <StatusBadge variant={sourceTone}>{sourceLabel}</StatusBadge> : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <p className="text-[8px] uppercase tracking-wider text-white/20">Current work</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/65">{currentWork}</p>
      </div>

      {room ? (
        <div className="mt-3">
          <p className="text-[8px] uppercase tracking-wider text-white/20">Room</p>
          <p className="mt-1 text-[10px] text-white/55">{room}</p>
        </div>
      ) : null}

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-wider ${chipTone(isActive)}`}>{skill}</span>
          ))}
        </div>
      ) : null}

      {tools.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tools.map((tool) => (
            <span key={tool} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/45">{tool}</span>
          ))}
        </div>
      ) : null}

      {evidence ? (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[8px] uppercase tracking-wider text-white/20">Evidence</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/55">{evidence}</p>
        </div>
      ) : null}

      {breakState ? (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-white/45">
          Break room: {breakState}
        </div>
      ) : null}
    </GlassCard>
  )
}
