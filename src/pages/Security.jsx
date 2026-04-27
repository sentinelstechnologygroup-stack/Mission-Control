import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import { Shield, Lock, AlertTriangle, Eye, Server, Code, FileCheck, Accessibility, Scale, Rocket, CheckCircle, XCircle } from "lucide-react";

const infraMetrics = [
  { label: "Infra Health", value: "94%", status: "active" },
  { label: "Key Misuse", value: "0", status: "active" },
  { label: "Scope Violations", value: "0", status: "active" },
  { label: "Access Anomalies", value: "1", status: "warning" },
];

const infraAlerts = [
  { title: "Description Drift Detected", desc: "API schema description changed without doctrine update", severity: "warning", time: "17m ago", owner: "Within Core" },
  { title: "Rate Limit Threshold Hit", desc: "Database reached 85% of rate limit during peak load", severity: "warning", time: "2h ago", owner: "Nexus" },
];

const releaseChecks = [
  { label: "Code Quality", status: "pass", detail: "All linters passing, 0 critical issues" },
  { label: "Security Scan", status: "pass", detail: "No vulnerabilities in latest scan" },
  { label: "Compliance", status: "pass", detail: "SOC 2 requirements met" },
  { label: "Privacy (GDPR)", status: "pass", detail: "Data handling compliant" },
  { label: "Accessibility", status: "warn", detail: "2 minor WCAG AA issues in MeeshgCat" },
  { label: "Deployment Risk", status: "pass", detail: "Green for staging. Production pending approval." },
];

const checkIcons = { "Code Quality": Code, "Security Scan": Shield, "Compliance": Scale, "Privacy (GDPR)": Eye, "Accessibility": Accessibility, "Deployment Risk": Rocket };
const statusColors = { pass: "active", fail: "critical", warn: "warning" };

export default function Security() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[15px] font-semibold text-white/80 mb-1">Security</h1>
        <p className="text-[11px] text-white/30">Infrastructure and product security oversight — Perry's security umbrella</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Infrastructure Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-white/30" />
            <h2 className="text-[12px] font-semibold text-white/50 uppercase tracking-wider">Infrastructure Security</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {infraMetrics.map((m, i) => (
              <GlassCard key={i} delay={i * 0.05} className="text-center py-3">
                <p className="text-[18px] font-bold text-white/75 font-mono mb-1">{m.value}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">{m.label}</p>
                <StatusBadge variant={m.status} className="mt-2" dot={true}>
                  {m.status === "active" ? "OK" : "Alert"}
                </StatusBadge>
              </GlassCard>
            ))}
          </div>

          <GlassCard delay={0.15}>
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">Active Alerts</h3>
            <div className="space-y-2">
              {infraAlerts.map((alert, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-amber-500/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[11px] text-white/65 font-medium">{alert.title}</p>
                        <span className="text-[9px] text-white/15 font-mono">{alert.time}</span>
                      </div>
                      <p className="text-[10px] text-white/30 leading-relaxed">{alert.desc}</p>
                      <p className="text-[9px] text-white/20 mt-1">Owner: {alert.owner}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Product / Release Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-white/30" />
            <h2 className="text-[12px] font-semibold text-white/50 uppercase tracking-wider">Product / Release Security</h2>
          </div>

          <GlassCard delay={0.1}>
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">Release Readiness</h3>
            <div className="space-y-2">
              {releaseChecks.map((check, i) => {
                const Icon = checkIcons[check.label] || Shield;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
                    <Icon className="w-4 h-4 text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/60 font-medium">{check.label}</p>
                      <p className="text-[9px] text-white/25 mt-0.5">{check.detail}</p>
                    </div>
                    <div className="shrink-0">
                      {check.status === "pass" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : check.status === "fail" ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Overall Status</h3>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
              <p className="text-[14px] font-semibold text-emerald-400 mb-1">System Secure</p>
              <p className="text-[10px] text-white/30">1 advisory warning · 0 critical · All gates passing</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}