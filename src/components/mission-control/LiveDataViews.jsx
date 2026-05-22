import GlassCard from './GlassCard'
import StatusBadge from './StatusBadge'
import { Link } from 'react-router-dom'

export function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[15px] font-semibold text-white/80">{title}</h1>
        {subtitle ? <p className="text-[11px] text-white/30">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function MetricGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <GlassCard key={item.label} className="py-3">
          <p className="text-[9px] uppercase tracking-wider text-white/25">{item.label}</p>
          <p className="mt-2 text-[18px] font-bold font-mono text-white/70">{item.value ?? '—'}</p>
          {item.sub ? <p className="mt-1 text-[9px] text-white/25">{item.sub}</p> : null}
        </GlassCard>
      ))}
    </div>
  )
}

export function SectionCard({ title, subtitle = null, children, action = null, className = '' }) {
  return (
    <GlassCard className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h2>
          {subtitle ? <p className="mt-1 text-[10px] text-white/25">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </GlassCard>
  )
}

export function SimpleTable({ columns = [], rows = [], empty = 'No records available.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[10px]">
        <thead>
          <tr className="border-b border-white/[0.06] text-white/30">
            {columns.map((column) => (
              <th key={column.key} className="px-2 py-2 font-medium uppercase tracking-wider">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={row.id || row.jobId || rowIndex} className="border-b border-white/[0.04] align-top last:border-b-0">
              {columns.map((column) => {
                const value = typeof column.render === 'function' ? column.render(row) : row[column.key]
                return (
                  <td key={column.key} className="px-2 py-2 text-white/55">
                    {value ?? '—'}
                  </td>
                )
              })}
            </tr>
          )) : (
            <tr>
              <td className="px-2 py-4 text-white/25" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function StatusPill({ status }) {
  const value = String(status || 'unknown').toLowerCase()
  const variant = value === 'running' || value === 'active' || value === 'healthy' || value === 'generated'
    ? 'active'
    : value === 'blocked' || value === 'failed' || value === 'error' || value === 'missing'
      ? 'critical'
      : value === 'queued' || value === 'pending' || value === 'paused' || value === 'warning'
        ? 'warning'
        : value === 'complete' || value === 'completed' || value === 'done' || value === 'success'
          ? 'review'
          : 'idle'
  return <StatusBadge variant={variant} dot={false}>{status || 'unknown'}</StatusBadge>
}

export function LinkButton({ to, children }) {
  return (
    <Link to={to} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[10px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/75">
      {children}
    </Link>
  )
}

export function KeyValueList({ items = [] }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-white/[0.02] px-3 py-2">
          <p className="text-[8px] uppercase tracking-wider text-white/20">{item.label}</p>
          <p className="mt-1 text-[11px] text-white/60">{item.value ?? '—'}</p>
        </div>
      ))}
    </div>
  )
}
