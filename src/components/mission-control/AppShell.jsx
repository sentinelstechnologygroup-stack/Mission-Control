import { Outlet } from "react-router-dom";
import LeftRail from "./LeftRail";
import TopNav from "./TopNav";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#090b0e] text-white/80">
      <LeftRail />
      <TopNav />
      <main className="overflow-x-hidden px-3 pb-6 pt-[60px] lg:ml-[76px]">
        <div className="mx-auto max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
