import GlassCard from '@/components/mission-control/GlassCard'

export default function DepartmentRoom({ title, subtitle, children, action = null, tone = 'idle', accent = null }) {
  const toneClass = tone === 'active'
    ? 'border-emerald-500/20 bg-emerald-500/6'
    : tone === 'critical'
      ? 'border-rose-500/20 bg-rose-500/6'
      : tone === 'warning'
        ? 'border-amber-500/20 bg-amber-500/6'
        : 'border-white/[0.06] bg-white/[0.03]'

  return (
    <GlassCard className={`border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</p>
          {subtitle ? <p className="mt-1 text-[10px] text-white/25">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {accent ? <p className="mb-3 text-[9px] uppercase tracking-[0.28em] text-white/25">{accent}</p> : null}
      {children}
    </GlassCard>
  )
}
