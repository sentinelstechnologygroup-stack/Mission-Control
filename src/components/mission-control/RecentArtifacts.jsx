import GlassCard from "./GlassCard";
import { FileText, Code, BarChart3, Layout } from "lucide-react";

const artifacts = [
  { icon: BarChart3, title: "Growth GTM Playbook", owner: "Perry", via: "Sam to commit ast", time: "3m" },
  { icon: Layout, title: "Demo.ai Wireframes", owner: "Nexus", via: "Meaghh Neofue", time: "11m" },
  { icon: FileText, title: "Client Requirements Doc", owner: "Ivy", via: "Nethe Utriighouteners", time: "18m" },
  { icon: Code, title: "QuickView Prototype", owner: "Perry", via: "Nethe hvrlghusreecents", time: "64m" },
];

export default function RecentArtifacts() {
  return (
    <GlassCard delay={0.25}>
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Recent Artifacts</h3>
      <div className="space-y-2">
        {artifacts.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer">
              <Icon className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/60 font-medium truncate">{a.title}</p>
                <p className="text-[9px] text-white/20 truncate">{a.owner} · {a.via}</p>
              </div>
              <span className="text-[9px] text-white/15 font-mono shrink-0">{a.time}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}