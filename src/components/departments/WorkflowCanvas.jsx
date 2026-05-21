import { ArrowRight, Activity, BadgeCheck, Bot, CircleDot, FileText, Shield, Workflow } from 'lucide-react'
import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'

function toneToVariant(status = 'idle') {
  const value = String(status || '').toLowerCase()
  if (['running', 'active', 'live', 'healthy', 'ready', 'available', 'complete', 'completed', 'done', 'success'].includes(value)) return 'active'
  if (['blocked', 'rejected', 'failed', 'error', 'critical', 'missing', 'unavailable', 'awaiting_approval'].includes(value)) return 'critical'
  if (['queued', 'pending', 'cooldown', 'warning', 'review'].includes(value)) return 'warning'
  return 'idle'
}

function iconForType(type = '') {
  switch (String(type).toLowerCase()) {
    case 'trigger':
    case 'intake':
      return Activity
    case 'routing':
    case 'handoff':
      return ArrowRight
    case 'agent':
      return Bot
    case 'review':
      return BadgeCheck
    case 'approval':
      return Shield
    case 'evidence':
      return FileText
    case 'completion':
      return CircleDot
    default:
      return Workflow
  }
}

export default function WorkflowCanvas({ title, subtitle, nodes = [], footer = null, compact = false }) {
  return (
    <GlassCard className="border border-white/[0.06] bg-white/[0.03] p-4">
      {(title || subtitle) ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-[10px] text-white/25">{subtitle}</p> : null}
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/35">
            n8n-style flow
          </span>
        </div>
      ) : null}

      {nodes.length ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-stretch gap-3">
            {nodes.map((node, index) => {
              const Icon = iconForType(node.type)
              return (
                <div key={node.id || `${node.label}-${index}`} className="flex items-center gap-3">
                  <details className={`group shrink-0 rounded-2xl border bg-white/[0.025] p-3 ${compact ? 'w-44' : 'w-56'} ${toneToVariant(node.status) === 'active' ? 'border-emerald-500/20' : toneToVariant(node.status) === 'critical' ? 'border-rose-500/20' : toneToVariant(node.status) === 'warning' ? 'border-amber-500/20' : 'border-white/[0.06]'}`}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-white/70">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-white/78">{node.label}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/25">{node.type || 'node'}</p>
                          </div>
                        </div>
                        <StatusBadge variant={toneToVariant(node.status)}>{node.status || 'idle'}</StatusBadge>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-2 text-[10px] text-white/45">
                      {node.detail ? <p className="leading-relaxed">{node.detail}</p> : null}
                      {node.owner ? <p>Owner: {node.owner}</p> : null}
                      {node.tool ? <p>Tool / model: {node.tool}</p> : null}
                      {node.evidence ? <p>Evidence: {node.evidence}</p> : null}
                      {node.id ? <p>Node ID: {node.id}</p> : null}
                      <p className="text-white/30">Expand for node details.</p>
                    </div>
                  </details>
                  {index < nodes.length - 1 ? <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/20 md:block" /> : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-white/25">No live workflow records yet.</p>
      )}

      {footer ? <div className="mt-3 text-[10px] text-white/25">{footer}</div> : null}
    </GlassCard>
  )
}
