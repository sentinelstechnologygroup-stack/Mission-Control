import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import GlassCard from './GlassCard'
import StatusBadge from './StatusBadge'
import { Shield, AlertTriangle, Lock } from 'lucide-react'

export default function SecurityCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['runtime', 'alerts', 'security'],
    queryFn: api.runtimeAlerts,
    refetchInterval: 15000,
  })

  const alerts = Array.isArray(data)
    ? data.filter((a) => /security|auth|secret|permission|privacy|runtime-health/i.test(`${a.source} ${a.summary}`)).slice(0, 2)
    : []
  const state = isLoading ? 'LOADING' : isError ? 'FALLBACK' : alerts.length ? 'LIVE' : 'DEGRADED'

  return (
    <GlassCard delay={0.2}>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xs font-semibold text-white/60 uppercase tracking-wider'>System Security</h3>
        <div className='flex items-center gap-2'>
          <span className='text-[9px] text-white/25 font-mono'>{state}</span>
          <Shield className='w-3.5 h-3.5 text-white/20' />
        </div>
      </div>
      <div className='space-y-3'>
        {alerts.length ? alerts.map((a, i) => (
          <div key={i} className='flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]'>
            <AlertTriangle className={`w-4 h-4 shrink-0 ${a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
            <div className='flex-1'>
              <p className='text-[11px] text-white/60 font-medium'>{a.summary}</p>
              <p className='text-[9px] text-white/25'>{a.detectedAt || 'unknown'} · {a.source}</p>
            </div>
            <StatusBadge variant={a.severity === 'critical' ? 'critical' : 'warning'}>{a.severity}</StatusBadge>
          </div>
        )) : (
          <div className='flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]'>
            <Lock className='w-4 h-4 text-white/30 shrink-0' />
            <div className='flex-1'>
              <p className='text-[11px] text-white/60 font-medium'>No live security-specific alerts available</p>
              <p className='text-[9px] text-white/25'>{isError ? 'Fallback only' : 'Degraded: no dedicated security feed'}</p>
            </div>
            <StatusBadge variant={isError ? 'warning' : 'idle'}>{isError ? 'FALLBACK' : 'DEGRADED'}</StatusBadge>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
