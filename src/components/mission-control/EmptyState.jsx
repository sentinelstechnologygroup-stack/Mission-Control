import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-white/20" />
        </div>
      )}
      <p className="text-[13px] font-medium text-white/40 mb-1">{title}</p>
      {description && <p className="text-[11px] text-white/25 max-w-xs">{description}</p>}
    </div>
  );
}