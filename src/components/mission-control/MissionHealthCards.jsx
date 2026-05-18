import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import GlassCard from './GlassCard'
import StatusBadge from './StatusBadge'
import { StageBadge } from './LifecycleStage'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, ArrowRight, X } from 'lucide-react'

const riskColors = { low: 'active', medium: 'warning', high: 'critical' }

function MissionDetailDrawer({ mission, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 320 }} className='fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-white/[0.08] bg-[#090b0e]/98 backdrop-blur-xl sm:w-96' style={{ top: '52px' }}>
      <div className='p-5'>
        <div className='flex items-center justify-between mb-4'><StageBadge stage={mission.phase || 'INFO'} /><button onClick={onClose} className='p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25'><X className='w-4 h-4' /></button></div>
        <h2 className='text-[15px] font-semibold text-white/80 mb-4'>{mission.name}</h2>
        <div className='space-y-3'>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Owner</p><p className='text-[11px] text-white/55'>{mission.owner}</p></div>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Approval</p><p className='text-[11px] text-white/55'>{mission.approval}</p></div>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Truth</p><p className='text-[11px] text-white/55 font-mono'>{mission.truthStatus}</p></div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MissionHealthCards() {
  const [selected, setSelected] = useState(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['home', 'summary'], queryFn: api.homeSummary, refetchInterval: 10000 })
  const missions = Array.isArray(data?.missions) && data.missions.length ? data.missions : [{ id: 'fallback', name: 'No live missions available', owner: 'Mission Control', phase: 'FALLBACK', risk: 'medium', approval: 'Fallback only', progress: 0, truthStatus: isError ? 'FALLBACK' : 'DEGRADED', tasks: 0 }]

  return (
    <>
      <GlassCard delay={0.2}>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-xs font-semibold text-white/50 uppercase tracking-wider'>Active Missions</h3>
          <div className='flex items-center gap-2'><span className='text-[9px] text-white/25 font-mono'>{isLoading ? 'LOADING' : isError ? 'FALLBACK' : (data?.truthStatus || 'LIVE')}</span><Target className='w-3.5 h-3.5 text-white/20' /></div>
        </div>
        <div className='space-y-2'>
          {missions.map((m, i) => (
            <button key={m.id || i} onClick={() => setSelected(m)} className='w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.07] transition-all group'>
              <div className='flex-1 min-w-0'>
                <p className='text-[11px] text-white/65 font-semibold truncate mb-1'>{m.name}</p>
                <div className='flex items-center gap-2 mb-1.5'><span className='text-[9px] text-white/25'>{m.owner}</span><span className='text-[8px] text-white/10'>·</span><span className='text-[9px] text-white/20'>{m.tasks || 0} tasks</span></div>
                <div className='h-1 bg-white/[0.06] rounded-full overflow-hidden'><div className='h-full bg-emerald-500/40 rounded-full' style={{ width: `${m.progress || 0}%` }} /></div>
              </div>
              <div className='flex flex-col items-end gap-1.5 shrink-0'><StageBadge stage={m.phase || 'INFO'} /><StatusBadge variant={riskColors[m.risk] || 'idle'} dot={false}>{m.truthStatus || 'UNKNOWN'}</StatusBadge></div>
              <ArrowRight className='w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0' />
            </button>
          ))}
        </div>
      </GlassCard>
      <AnimatePresence>{selected && <MissionDetailDrawer mission={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </>
  )
}
