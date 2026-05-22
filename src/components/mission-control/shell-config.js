import {
  Home,
  Activity,
  MessageSquare,
  Bot,
  Target,
  ShieldCheck,
  Telescope,
  Calendar,
  BookOpen,
  Lock,
  DollarSign,
  Settings,
  Sparkles,
  Radio,
} from "lucide-react";

export const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/triage", label: "Triage Center", icon: Activity, hidden: true },
  { path: "/nettie", label: "Nettie", icon: MessageSquare, hidden: true },
  { path: "/runtime", label: "Mission Control Runtime", icon: Sparkles, hidden: true },
  { path: "/operations", label: "Operations", icon: Radio, hidden: true },
  { path: "/departments", label: "Departments", icon: Target },
  { path: "/agents", label: "Agents", icon: Bot },
  { path: "/missions", label: "Missions", icon: Target },
  { path: "/approvals", label: "Approvals", icon: ShieldCheck },
  { path: "/intelligence", label: "Intel", icon: Telescope, hidden: true },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/security", label: "Security", icon: Lock },
  { path: "/costs", label: "Costs", icon: DollarSign },
  { path: "/system", label: "System", icon: Settings },
];

export function getRouteLabel(pathname) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/departments")) return "Departments";
  if (pathname.startsWith("/agents")) return "Agents";
  if (pathname.startsWith("/missions")) return "Missions";
  if (pathname.startsWith("/approvals")) return "Approvals";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/knowledge")) return "Knowledge";
  if (pathname.startsWith("/security")) return "Security";
  if (pathname.startsWith("/costs")) return "Costs";
  if (pathname.startsWith("/system")) return "System";
  if (pathname.startsWith("/nettie")) return "Nettie";
  if (pathname.startsWith("/runtime")) return "Runtime";
  return "Workspace";
}
