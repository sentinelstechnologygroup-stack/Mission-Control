import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import GlassCard from './GlassCard';
import { MessageSquare, GitBranch, Search, FileText, Zap, CheckCircle } from 'lucide-react';
const icons={comment:MessageSquare,spawn:GitBranch,scan:Search,doc:FileText,task:Zap,approve:CheckCircle,job:Zap,report:FileText};
const fallback=[{type:'comment',summary:'Fallback activity feed active',updatedAt:null,truthStatus:'FALLBACK'}];
export default function ActivityFeed(){
  const {data,isLoading,isError}=useQuery({queryKey:['activity','recent'],queryFn:api.activityRecent,refetchInterval:10000});
  const rows=Array.isArray(data)&&data.length?data:fallback;
  return <GlassCard className='p-0' delay={0.3}><div className='px-4 pt-4 pb-2 flex items-center justify-between'><h3 className='text-xs font-semibold text-white/60 uppercase tracking-wider'>Activity</h3><span className='text-[9px] text-white/25 font-mono'>{isLoading?'LOADING':isError?'FALLBACK':(rows[0]?.truthStatus||'LIVE')}</span></div><div className='divide-y divide-white/[0.04]'>{rows.map((item,i)=>{const Icon=icons[item.type]||Zap;return <div key={item.id||i} className='flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors'><Icon className='w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0'/><p className='text-[11px] text-white/50 leading-relaxed flex-1'>{item.summary||item.text}</p><span className='text-[9px] text-white/20 font-mono whitespace-nowrap shrink-0'>{item.updatedAt?new Date(item.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):item.truthStatus}</span></div>})}</div></GlassCard>
}
