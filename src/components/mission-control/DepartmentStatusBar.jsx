import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import GlassCard from './GlassCard'
import StatusBadge from './StatusBadge'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Brain, TrendingUp, Code, Wrench, X, FileText } from 'lucide-react'

const executiveIds = ['nettie', 'van', 'perry', 'dana', 'torina', 'icky', 'funboy', 'rab']
const iconFor = (name = '') => /perry/i.test(name) ? Shield : /funboy/i.test(name) ? Brain : /dana/i.test(name) ? TrendingUp : /van/i.test(name) ? Code : /icky|torina|rab|novella|nettie/i.test(name) ? Wrench : FileText

function DeptDrawer({ dept, onClose }) {
  const Icon = iconFor(dept.name)
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 320 }} className='fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-white/[0.08] bg-[#090b0e]/98 backdrop-blur-xl sm:w-96' style={{ top: '52px' }}>
      <div className='p-5'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center'><Icon className='w-5 h-5 text-white/40' /></div>
            <div><h2 className='text-[15px] font-semibold text-white/80'>{dept.name}</h2><p className='text-[9px] text-white/25'>{dept.domain || 'Unknown domain'}</p></div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25'><X className='w-4 h-4' /></button>
        </div>
        <div className='space-y-3'>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Ownership</p><p className='text-[11px] text-white/45'>{dept.ownership || 'No live ownership summary available.'}</p></div>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Handoff Rule</p><p className='text-[11px] text-white/45'>{dept.handoff || 'No live handoff summary available.'}</p></div>
          <div className='p-2.5 rounded-xl bg-white/[0.02]'><p className='text-[9px] text-white/20 uppercase mb-1'>Truth</p><p className='text-[11px] text-white/45 font-mono'>{dept.truthStatus || 'UNKNOWN'}</p></div>
        </div>
      </div>
    </motion.div>
  )
}

export default function DepartmentStatusBar() {
  const [selected, setSelected] = useState(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['agents'], queryFn: api.agents, refetchInterval: 30000 })
  const rows = Array.isArray(data) && data.length ? data.filter((a) => executiveIds.includes(a.id)) : [{ id: 'fallback', name: 'Fallback agent list active', truthStatus: 'FALLBACK', activeQueueCount: 0 }]

  return (
    <>
      <GlassCard delay={0.1}>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-xs font-semibold text-white/50 uppercase tracking-wider'>Department Status</h3>
          <span className='text-[9px] text-white/25 font-mono'>{isLoading ? 'LOADING' : isError ? 'FALLBACK' : 'LIVE'}</span>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
          {rows.map((dept, i) => {
            const Icon = iconFor(dept.name)
            const complete = !!dept.agentFilesystem?.complete
            return (
              <button key={dept.id || i} onClick={() => setSelected({ name: dept.name, domain: dept.department || dept.roleTitle, ownership: dept.agentFilesystem?.surfaces?.ownership || dept.description, handoff: dept.agentFilesystem?.surfaces?.handoffs, truthStatus: complete ? 'LIVE' : 'FALLBACK' })} className='flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all'>
                <div className='w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center'><Icon className='w-4 h-4 text-white/35' /></div>
                <div className='text-center'><p className='text-[11px] font-semibold text-white/65'>{dept.name}</p><p className='text-[8px] text-white/20'>{dept.department || dept.roleTitle || 'Unknown'}</p></div>
                <div className='flex items-center gap-1'><span className='text-[11px] font-bold font-mono text-emerald-400'>{dept.activeQueueCount || 0}</span><span className='text-[8px] text-white/20'>jobs</span></div>
                <StatusBadge variant={complete ? 'active' : 'warning'} dot={false}>{complete ? 'LIVE' : 'FALLBACK'}</StatusBadge>
              </button>
            )
          })}
        </div>
      </GlassCard>
      <AnimatePresence>{selected && <DeptDrawer dept={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </>
  )
}
