import {
  Home,
  MessageSquare,
  Activity,
  Radio,
  Bot,
  Target,
  ShieldCheck,
  Telescope,
  Calendar,
  BookOpen,
  Lock,
  Settings,
} from "lucide-react";

export const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/triage", label: "Triage Center", icon: Activity, accent: true },
  { path: "/nettie", label: "Nettie", icon: MessageSquare, badge: 3, accent: true },
  { path: "/operations", label: "Operations", icon: Radio },
  { path: "/agents", label: "Agents", icon: Bot },
  { path: "/missions", label: "Missions", icon: Target },
  { path: "/approvals", label: "Approvals", icon: ShieldCheck, badge: 6 },
  { path: "/intelligence", label: "Intel", icon: Telescope },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/security", label: "Security", icon: Lock },
  { path: "/system", label: "System", icon: Settings },
];

export function getRouteLabel(pathname) {
  const exact = navItems.find((item) => item.path === pathname);
  if (exact) return exact.label;
  const nested = navItems.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return nested?.label || "Workspace";
}
