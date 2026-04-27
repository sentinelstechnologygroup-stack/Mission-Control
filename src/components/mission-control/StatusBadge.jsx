import { cn } from "@/lib/utils";

const variants = {
  active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warning: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  info: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  idle: "text-white/25 border-white/10 bg-white/[0.03]",
  review: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  pending: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

const dotColors = {
  active: "#20c87a",
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#22d3ee",
  idle: "rgba(255,255,255,0.2)",
  review: "#a855f7",
  pending: "#f59e0b",
};

const dotGlow = {
  active: "0 0 5px rgba(32,200,122,0.8)",
  warning: "0 0 5px rgba(245,158,11,0.7)",
  critical: "0 0 5px rgba(239,68,68,0.7)",
  info: "0 0 5px rgba(34,211,238,0.7)",
  idle: "none",
  review: "0 0 5px rgba(168,85,247,0.7)",
  pending: "0 0 5px rgba(245,158,11,0.7)",
};

export default function StatusBadge({ variant = "active", children, dot = true, className }) {
  const v = variants[variant] || variants.idle;
  const dc = dotColors[variant] || dotColors.idle;
  const dg = dotGlow[variant] || "none";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-widest border font-mono",
        v,
        className
      )}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dc, boxShadow: dg }}
        />
      )}
      {children}
    </span>
  );
}