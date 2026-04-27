import { cn } from "@/lib/utils";

export default function SubTabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-0 mb-5 overflow-x-auto pb-1 border-b" style={{ borderColor: "rgba(32,200,120,0.08)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-3 py-2 text-[9px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap font-mono",
            activeTab === tab.id
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-white/25 hover:text-white/55"
          )}
          style={activeTab === tab.id ? { borderBottomColor: "#20c87a", marginBottom: "-1px" } : {}}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "ml-1.5 text-[8px] px-1 py-0.5 rounded font-mono",
              activeTab === tab.id ? "text-emerald-400/70" : "text-white/20"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}