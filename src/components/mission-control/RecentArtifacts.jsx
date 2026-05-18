import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import GlassCard from './GlassCard';
import { FileText, Code, BarChart3, Layout } from 'lucide-react';
const fallback=[{title:'Fallback artifact list active',department:'Mission Control',createdBy:'Nettie',createdAt:null,truthStatus:'FALLBACK'}];
const pick=(r)=>/build|deploy/i.test(r.reportType||'')?Code:/executive|digest/i.test(r.reportType||'')?Layout:BarChart3;
export default function RecentArtifacts(){
  const {data,isLoading,isError}=useQuery({queryKey:['reports','recent'],queryFn:api.reportsRecent,refetchInterval:30000});
  const rows=Array.isArray(data)&&data.length?data:fallback;
  return <GlassCard delay={0.25}><div className='flex items-center justify-between mb-3'><h3 className='text-xs font-semibold text-white/60 uppercase tracking-wider'>Recent Artifacts</h3><span className='text-[9px] text-white/25 font-mono'>{isLoading?'LOADING':isError?'FALLBACK':(rows[0]?.truthStatus||'LIVE')}</span></div><div className='space-y-2'>{rows.map((a,i)=>{const Icon=pick(a)||FileText;return <div key={a.id||i} className='flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer'><Icon className='w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0'/><div className='flex-1 min-w-0'><p className='text-[11px] text-white/60 font-medium truncate'>{a.title}</p><p className='text-[9px] text-white/20 truncate'>{a.department||a.owner||'—'} · {a.createdBy||a.via||'—'}</p></div><span className='text-[9px] text-white/15 font-mono shrink-0'>{a.createdAt?new Date(a.createdAt).toLocaleDateString():a.truthStatus}</span></div>})}</div></GlassCard>
}
