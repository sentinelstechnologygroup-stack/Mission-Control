import { Activity, Bot, HardDriveDownload, Shield } from "lucide-react";

const statusItems = [
  { icon: Activity, label: "Shell", value: "Stable", accent: "text-emerald-400" },
  { icon: Bot, label: "Agents", value: "Preserved", accent: "text-blue-300" },
  { icon: HardDriveDownload, label: "Runtime", value: "Adapter Ready", accent: "text-amber-300" },
  { icon: Shield, label: "Phase", value: "UI-1", accent: "text-white/70" },
];

export default function BottomStatusStrip() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-[34px] border-t bg-[#090b0e]/95 backdrop-blur-sm lg:left-[76px] xl:right-[320px]"
      style={{ borderColor: "rgba(32,200,120,0.10)" }}
    >
      <div className="flex h-full items-center gap-3 overflow-x-auto px-3 sm:px-4">
        {statusItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex shrink-0 items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-white/25">
              <Icon className={`h-3 w-3 ${item.accent}`} />
              <span>{item.label}</span>
              <span className={`font-semibold ${item.accent}`}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
