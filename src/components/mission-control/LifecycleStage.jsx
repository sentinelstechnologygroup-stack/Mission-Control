import { cn } from "@/lib/utils";

const stages = ["INTAKE", "SCOPED", "IN_PROGRESS", "EXEC_QA", "PERRY_QA", "NETTIE_QA", "APPROVAL"];

const stageColors = {
  INTAKE: "bg-white/10 text-white/40",
  SCOPED: "bg-blue-500/20 text-blue-300",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-300",
  EXEC_QA: "bg-purple-500/20 text-purple-300",
  PERRY_QA: "bg-amber-500/20 text-amber-300",
  NETTIE_QA: "bg-orange-500/20 text-orange-300",
  APPROVAL: "bg-emerald-500/20 text-emerald-300",
};

const stageLineColors = {
  INTAKE: "bg-white/20",
  SCOPED: "bg-blue-500/40",
  IN_PROGRESS: "bg-cyan-500/40",
  EXEC_QA: "bg-purple-500/40",
  PERRY_QA: "bg-amber-500/40",
  NETTIE_QA: "bg-orange-500/40",
  APPROVAL: "bg-emerald-500/40",
};

// Mini inline badge version
export function StageBadge({ stage, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-semibold uppercase tracking-widest font-mono border",
      stageColors[stage] || "bg-white/5 text-white/30 border-white/10",
      className
    )}
    style={{ borderColor: "currentColor", borderOpacity: 0.2 }}
    >
      {stage}
    </span>
  );
}

// Full pipeline bar with current stage highlighted
export function LifecyclePipeline({ currentStage, compact = false }) {
  const currentIdx = stages.indexOf(currentStage);

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span className={cn(
              "text-[8px] px-1.5 py-0.5 rounded font-mono uppercase",
              i < currentIdx && "text-white/20",
              i === currentIdx && (stageColors[s] || "bg-white/10 text-white/60"),
              i > currentIdx && "text-white/10"
            )}>
              {s === "IN_PROGRESS" ? "WIP" : s.replace("_QA", "")}
            </span>
            {i < stages.length - 1 && (
              <span className={cn("text-[8px]", i < currentIdx ? "text-white/25" : "text-white/8")}>›</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        return (
          <div key={s} className="flex items-center">
            <div className={cn(
              "px-2 py-1 text-[8px] font-semibold uppercase tracking-wider rounded transition-all",
              isActive && (stageColors[s] || "bg-white/10 text-white/70"),
              isPast && "text-white/20",
              !isActive && !isPast && "text-white/10"
            )}>
              {s === "IN_PROGRESS" ? "WIP" : s.replace("_QA", " QA")}
            </div>
            {i < stages.length - 1 && (
              <div className={cn("h-px w-3", isPast ? stageLineColors[stages[i + 1]] : "bg-white/[0.06]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LifecyclePipeline;