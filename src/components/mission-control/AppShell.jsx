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

      <main className="px-3 pb-[52px] pt-[64px] sm:px-4 lg:ml-[76px] xl:mr-[320px]">
        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
