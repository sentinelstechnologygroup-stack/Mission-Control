import { useMemo } from 'react'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  CircleDot,
  Clock3,
  Cpu,
  Database,
  FileText,
  GitBranch,
  History,
  Link2,
  Shield,
  Workflow,
} from 'lucide-react'

import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'
import { truthLabel, truthVariant } from '@/lib/mcTruth'

const LANE_HEIGHT = 152
const COLUMN_WIDTH = 234
const NODE_WIDTH = 194
const NODE_HEIGHT = 112

const TYPE_ICON = {
  trigger: Activity,
  intake: Activity,
  branch: GitBranch,
  tool: Cpu,
  api: Link2,
  model: Bot,
  memory: Database,
  handoff: ArrowRight,
  review: BadgeCheck,
  approval: Shield,
  evidence: FileText,
  execution: Workflow,
  log: History,
  completion: CircleDot,
  wait: Clock3,
}

function toneToVariant(status = 'idle') {
  const value = String(status || '').toLowerCase()
  if (['running', 'active', 'live', 'healthy', 'ready', 'available', 'complete', 'completed', 'done', 'success'].includes(value)) return 'active'
  if (['blocked', 'rejected', 'failed', 'error', 'critical', 'missing', 'unavailable'].includes(value)) return 'critical'
  if (['queued', 'pending', 'cooldown', 'warning', 'review', 'waiting', 'hold'].includes(value)) return 'warning'
  if (['info', 'registry-backed'].includes(value)) return 'info'
  return 'idle'
}

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function iconForType(type = '') {
  return TYPE_ICON[normalize(type)] || Workflow
}

function statusRank(status = 'idle') {
  const value = String(status || '').toLowerCase()
  if (['complete', 'completed', 'done', 'success'].includes(value)) return 4
  if (['running', 'active', 'live', 'healthy', 'ready', 'available'].includes(value)) return 3
  if (['queued', 'pending', 'review', 'waiting', 'hold', 'cooldown'].includes(value)) return 2
  if (['blocked', 'failed', 'rejected', 'error', 'critical'].includes(value)) return 1
  return 0
}

export default function AgentWorkflowCanvas({
  title,
  subtitle,
  sourceLabel = 'registry-backed',
  nodes = [],
  edges = [],
  activeNodeId = null,
  evidenceItems = [],
  logItems = [],
  summary = [],
  laneOrder = [],
}) {
  const prepared = useMemo(() => {
    const laneList = laneOrder.length
      ? laneOrder
      : Array.from(new Set(nodes.map((node) => node.lane || 'main')))

    const laneIndex = new Map(laneList.map((lane, index) => [lane, index]))

    const normalizedNodes = nodes.map((node, index) => {
      const lane = node.lane || 'main'
      const column = Number.isFinite(Number(node.column)) ? Number(node.column) : index
      return {
        ...node,
        lane,
        column,
        laneIndex: laneIndex.has(lane) ? laneIndex.get(lane) : 0,
        x: (column * COLUMN_WIDTH) + 24,
        y: (laneIndex.has(lane) ? laneIndex.get(lane) : 0) * LANE_HEIGHT + 32,
      }
    })

    const nodeMap = new Map(normalizedNodes.map((node) => [node.id, node]))

    const maxColumn = normalizedNodes.reduce((max, node) => Math.max(max, node.column), 0)
    const width = (maxColumn * COLUMN_WIDTH) + NODE_WIDTH + 140
    const height = Math.max(laneList.length, 1) * LANE_HEIGHT + 64

    return { laneList, laneIndex, normalizedNodes, nodeMap, width, height }
  }, [laneOrder, nodes])

  const activeNode = prepared.nodeMap.get(activeNodeId) || prepared.normalizedNodes.find((node) => statusRank(node.status) === 3) || null
  const summaryItems = summary.length ? summary : [
    { label: 'Source', value: sourceLabel },
    { label: 'Nodes', value: prepared.normalizedNodes.length },
    { label: 'Branches', value: edges.length },
  ]

  return (
    <GlassCard className="border border-white/[0.06] bg-white/[0.03] p-4">
      {(title || subtitle) ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-[10px] text-white/25">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={truthVariant(sourceLabel)}>{truthLabel(sourceLabel).toUpperCase()}</StatusBadge>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/35">n8n-like execution canvas</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="text-[8px] uppercase tracking-wider text-white/20">{item.label}</p>
            <p className="mt-1 text-[11px] text-white/68">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-auto rounded-3xl border border-white/[0.06] bg-black/25">
        <div className="relative" style={{ width: prepared.width, height: prepared.height }}>
          <svg className="pointer-events-none absolute inset-0" width={prepared.width} height={prepared.height} viewBox={`0 0 ${prepared.width} ${prepared.height}`}>
            <defs>
              <marker id="agent-workflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.22)" />
              </marker>
            </defs>
            {edges.map((edge, index) => {
              const from = prepared.nodeMap.get(edge.from)
              const to = prepared.nodeMap.get(edge.to)
              if (!from || !to) return null
              const fromX = from.x + NODE_WIDTH
              const fromY = from.y + NODE_HEIGHT / 2
              const toX = to.x
              const toY = to.y + NODE_HEIGHT / 2
              const midX = fromX + Math.max(48, (toX - fromX) * 0.5)
              const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
              const activeEdge = activeNode && (normalize(activeNode.id) === normalize(edge.to) || normalize(activeNode.id) === normalize(edge.from))
              return (
                <path
                  key={`${edge.from}-${edge.to}-${index}`}
                  d={path}
                  fill="none"
                  stroke={activeEdge ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.18)'}
                  strokeWidth={activeEdge ? 2.5 : 1.6}
                  strokeDasharray={edge.kind === 'branch' ? '5 6' : '0'}
                  markerEnd="url(#agent-workflow-arrow)"
                />
              )
            })}
          </svg>

          {prepared.normalizedNodes.map((node) => {
            const Icon = iconForType(node.type)
            const isActive = normalize(node.id) === normalize(activeNodeId)
            const statusVariant = toneToVariant(node.status)
            return (
              <div
                key={node.id}
                className={`absolute rounded-3xl border p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] ${isActive ? 'ring-2 ring-emerald-400/60' : ''}`}
                style={{ left: node.x, top: node.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT, background: 'rgba(255,255,255,0.03)', borderColor: statusVariant === 'active' ? 'rgba(16,185,129,0.3)' : statusVariant === 'critical' ? 'rgba(244,63,94,0.3)' : statusVariant === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className={`rounded-2xl border p-2 ${isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] bg-white/[0.04] text-white/70'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white/80">{node.label}</p>
                      <p className="text-[9px] uppercase tracking-wider text-white/25">{node.type || 'node'} · lane {node.lane || 'main'}</p>
                    </div>
                  </div>
                  <StatusBadge variant={statusVariant}>{node.status || 'idle'}</StatusBadge>
                </div>

                {node.detail ? <p className="mt-2 text-[10px] leading-relaxed text-white/45">{node.detail}</p> : null}
                {node.tool ? <p className="mt-2 text-[9px] uppercase tracking-wider text-white/25">Tool/API/model/memory: {node.tool}</p> : null}
                {node.owner ? <p className="mt-1 text-[9px] text-white/25">Owner: {node.owner}</p> : null}
                {node.evidence ? <p className="mt-1 text-[9px] text-white/25">Evidence: {node.evidence}</p> : null}
                {node.id ? <p className="mt-1 text-[8px] uppercase tracking-wider text-white/18">Node ID: {node.id}</p> : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/[0.06] bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25">Execution log</p>
              <p className="text-[10px] text-white/35">Current running step: {activeNode?.label || 'No live step'}</p>
            </div>
            <StatusBadge variant={activeNode ? toneToVariant(activeNode.status) : 'idle'}>{activeNode?.status || 'idle'}</StatusBadge>
          </div>
          <div className="mt-3 space-y-2">
            {logItems.length ? logItems.map((item) => (
              <div key={item.id || `${item.at}-${item.message}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/70">{item.message || item.summary || item.label}</p>
                  <p className="mt-1 text-[9px] text-white/25">{item.at || item.updatedAt || '—'}{item.step ? ` · ${item.step}` : ''}</p>
                </div>
                <StatusBadge variant={toneToVariant(item.status)}>{item.status || 'live'}</StatusBadge>
              </div>
            )) : <p className="text-[10px] text-white/25">No live execution log yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25">Evidence / output</p>
          <div className="mt-3 space-y-2">
            {evidenceItems.length ? evidenceItems.map((item) => (
              <div key={item.id || `${item.label}-${item.at}`} className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-white/70">{item.label || item.summary || item.title}</p>
                    <p className="mt-1 text-[9px] text-white/25">{item.detail || item.message || item.result || 'Evidence captured'}</p>
                  </div>
                  <StatusBadge variant={toneToVariant(item.status || item.truthStatus)}>{item.status || item.truthStatus || 'live'}</StatusBadge>
                </div>
              </div>
            )) : <p className="text-[10px] text-white/25">No live evidence/output captured yet.</p>}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
