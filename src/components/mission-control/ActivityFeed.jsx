import GlassCard from "./GlassCard";
import { MessageSquare, GitBranch, Search, FileText, Zap, CheckCircle } from "lucide-react";

const icons = {
  comment: MessageSquare,
  spawn: GitBranch,
  scan: Search,
  doc: FileText,
  task: Zap,
  approve: CheckCircle,
};

const activities = [
  { icon: "comment", text: "Sam commented on Growth Plan for new SaaS", time: "3m ago" },
  { icon: "spawn", text: "Nexus spawned sub-agent Git Assistant (L2)", time: "11m ago" },
  { icon: "scan", text: "Ivy scraped and indexed 6 new market trends", time: "16m ago" },
  { icon: "doc", text: "New PR for Task Board cleanups in review", time: "34m ago" },
  { icon: "task", text: "Henry added Task Cleanups to IN_PROGRESS", time: "41m ago" },
  { icon: "approve", text: "Patrick approved Demo.ai deployment package", time: "58m ago" },
];

export default function ActivityFeed() {
  return (
    <GlassCard className="p-0" delay={0.3}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Live Activity</h3>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="divide-y divide-white/[0.04]">
        {activities.map((item, i) => {
          const Icon = icons[item.icon] || Zap;
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
              <Icon className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/50 leading-relaxed flex-1">{item.text}</p>
              <span className="text-[9px] text-white/20 font-mono whitespace-nowrap shrink-0">{item.time}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}