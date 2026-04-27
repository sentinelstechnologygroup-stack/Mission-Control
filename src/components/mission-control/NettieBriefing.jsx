import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import { Bot, ChevronRight, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const approvalItems = [
  { title: "Demo.ai website", owner: "Perry / Development", action: "approve" },
  { title: "Growth & GTM Strategy", owner: "Sam / Growth", action: "review" },
  { title: "Performance Issue", owner: "Within Core / Security QA", action: "review" },
];

const contentItems = [
  { title: "MeeshgCat", owner: "Perry / Development", status: "APPROVE", variant: "active" },
  { title: "Cost 11525T", owner: "$0 um / Recuosiv", status: "NETTY-QA", variant: "review" },
  { title: "Cost 1377K", owner: "Active sare / Security QA", status: "EXEC RISK", variant: "critical" },
];

export default function NettieBriefing() {
  return (
    <GlassCard className="col-span-full lg:col-span-2" delay={0.1}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-white/80">Nettie Briefing</h3>
          <p className="text-[10px] text-white/30">Chief Orchestrator AI agent</p>
        </div>
        <StatusBadge variant="active" className="ml-auto">Online</StatusBadge>
      </div>

      <p className="text-[11px] text-white/40 mb-4 leading-relaxed">
        Pipeline is healthy. Two escalations need resolution. Research team flagged new market data. 
        Three items awaiting Patrick approval. Daily cost running 4% under budget.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Awaiting Approval */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Awaiting Approval</h4>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          </div>
          {approvalItems.map((item, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-white/60 font-medium">{item.title}</p>
                <ChevronRight className="w-3 h-3 text-white/15" />
              </div>
              <p className="text-[9px] text-white/25 mt-0.5">{item.owner}</p>
            </div>
          ))}
        </div>

        {/* Content Pipeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Content Pipeline</h4>
            <Clock className="w-3 h-3 text-white/20" />
          </div>
          {contentItems.map((item, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-white/60 font-medium">{item.title}</p>
                <StatusBadge variant={item.variant} dot={false}>{item.status}</StatusBadge>
              </div>
              <p className="text-[9px] text-white/25 mt-0.5">{item.owner}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}