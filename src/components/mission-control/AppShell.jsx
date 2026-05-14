import { Outlet } from "react-router-dom";
import LeftRail from "./LeftRail";
import TopNav from "./TopNav";
import RightInspectionPanel from "./RightInspectionPanel";
import BottomStatusStrip from "./BottomStatusStrip";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#090b0e] text-white/80">
      <LeftRail />
      <TopNav />
      <RightInspectionPanel />
      <BottomStatusStrip />

      <main className="overflow-x-hidden px-3 pb-[96px] pt-[60px] sm:px-4 md:pb-[80px] lg:ml-[76px] lg:pb-[52px] xl:mr-[320px]">        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
