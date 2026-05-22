import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { PageHeader } from '@/components/mission-control/LiveDataViews'

const DEPARTMENTS = [
  { id: 'command', name: 'Command', head: 'Nettie' },
  { id: 'technology', name: 'Technology', head: 'Van' },
  { id: 'media', name: 'Media', head: 'Torina' },
  { id: 'security', name: 'Security', head: 'Perry' },
  { id: 'finance', name: 'Finance', head: 'Dana' },
  { id: 'admin', name: 'Admin', head: 'Icky' },
  { id: 'opportunity', name: 'Opportunity', head: 'Funboy' },
  { id: 'research', name: 'Research', head: 'Rab' },
]

export default function DepartmentsOverview() {
  return (
    <div className="space-y-4">
      <PageHeader title="Departments" subtitle="Eight department boxes. Open a floor." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {DEPARTMENTS.map((dept) => (
          <Link
            key={dept.id}
            to={`/departments/${dept.id}`}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 transition-transform hover:-translate-y-0.5 hover:border-emerald-500/20 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-white/82">{dept.name}</div>
                <div className="mt-0.5 text-[10px] text-white/30">{dept.head}</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/55">
                <Target className="h-3 w-3" />
                Open floor
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
