import {
  Home,
  MessageSquare,
  Activity,
  Sparkles,
  Radio,
  Bot,
  Target,
  ShieldCheck,
  Telescope,
  Calendar,
  BookOpen,
  Lock,
  Settings,
  DollarSign,
} from "lucide-react";

export const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/triage", label: "Triage Center", icon: Activity, accent: true },
  { path: "/nettie", label: "Nettie", icon: MessageSquare, badge: 3, accent: true },
  { path: "/aurora", label: "Aurora POC", icon: Sparkles, badge: 7 },
  { path: "/operations", label: "Operations", icon: Radio },
  { path: "/departments", label: "Departments", icon: Target, badge: 9, accent: true },
  { path: "/agents", label: "Agents", icon: Bot },
  { path: "/missions", label: "Missions", icon: Target },
  { path: "/approvals", label: "Approvals", icon: ShieldCheck, badge: 6 },
  { path: "/intelligence", label: "Intel", icon: Telescope },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/security", label: "Security", icon: Lock },
  { path: "/costs", label: "Costs", icon: DollarSign, badge: 1, accent: true },
  { path: "/system", label: "System", icon: Settings },
];

export function getRouteLabel(pathname) {
  const exact = navItems.find((item) => item.path === pathname);
  if (exact) return exact.label;
  const nested = navItems.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return nested?.label || "Workspace";
}
