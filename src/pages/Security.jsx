import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import TruthBadge from "../components/mission-control/TruthBadge";
import { fetchJson } from "../lib/jsonFetch";
import { arrayify } from "../lib/mcTruth";
import { Shield, Lock, AlertTriangle, Eye, Server, Code, FileCheck, Accessibility, Scale, Rocket, CheckCircle, XCircle, Activity, Layers } from "lucide-react";

const seededReleaseChecks = [
  { label: "Code Quality", status: "pass", detail: "All linters passing, 0 critical issues" },
  { label: "Security Scan", status: "pass", detail: "No vulnerabilities in latest scan" },
  { label: "Compliance", status: "pass", detail: "Policy baseline satisfied" },
  { label: "Privacy (GDPR)", status: "pass", detail: "Data handling compliant" },
  { label: "Accessibility", status: "warn", detail: "Minor WCAG AA issues remain in unrelated surfaces" },
  { label: "Deployment Risk", status: "pass", detail: "Green for staging; production requires approval" },
];

const checkIcons = { "Code Quality": Code, "Security Scan": Shield, "Compliance": Scale, "Privacy (GDPR)": Eye, "Accessibility": Accessibility, "Deployment Risk": Rocket };

function SectionTitle({ title, source, note }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</h2>
        {note ? <p className="text-[10px] text-white/22 mt-1">{note}</p> : null}
      </div>
      <TruthBadge source={source} />
    </div>
  );
}

export default function Security() {
  const [dept, setDept] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [system, setSystem] = useState(null);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [deptData, runtimeData, systemData, costData] = await Promise.all([
          fetchJson("/api/departments/security", { signal: controller.signal }),
          fetchJson("/api/runtime", { signal: controller.signal }),
          fetchJson("/api/system", { signal: controller.signal }),
          fetchJson("/api/costs", { signal: controller.signal }),
        ]);
        setDept(deptData || null);
        setRuntime(runtimeData || null);
        setSystem(systemData || null);
        setCosts(costData || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to load security surface");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const activeJobs = arrayify(dept?.activeJobs);
  const auditReports = arrayify(dept?.audit?.reports || dept?.reports);
  const riskSignals = arrayify(dept?.audit?.metrics || dept?.metrics);
  const actions = arrayify(dept?.actions);
  const securitySource = loading ? "unavailable" : error ? "unavailable" : "live";

  const metricCards = [
    { label: "Security queue", value: activeJobs.length, source: "live", hint: "Live Perry-owned jobs waiting in the queue" },
    { label: "Audit records", value: auditReports.length, source: "registry-backed", hint: "Reports and checks exposed by Perry's office" },
    { label: "Risk signals", value: riskSignals.length, source: "registry-backed", hint: "Metrics and posture indicators from the department registry" },
    { label: "Runtime posture", value: runtime?.overallHealth || "unavailable", source: "live", hint: runtime?.operationalConfidence ? `Confidence ${runtime.operationalConfidence.label}` : "Confidence unavailable" },
  ];

  const metricStatus = (system?.counts?.blockedJobs ?? 0) > 0 ? "warning" : "active";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Security</h1>
          <p className="text-[11px] text-white/30">Perry's live security, compliance, and risk surface — every panel is source-labeled</p>
        </div>
        <TruthBadge source={securitySource} />
      </div>

      {(loading || error) && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TruthBadge source={securitySource} />
            <p className="text-[11px] text-white/35">{error ? error : "Loading Perry security posture…"}</p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metricCards.map((card) => (
          <GlassCard key={card.label} className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] text-white/25 uppercase tracking-wider">{card.label}</p>
              <TruthBadge source={card.source} />
            </div>
            <p className="text-[18px] font-semibold text-white/75 mb-1 break-all">{card.value}</p>
            <p className="text-[10px] text-white/30">{card.hint}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <GlassCard className="p-4">
          <SectionTitle title="Security queue" source="live" note="Perry's active jobs, audit items, and release blockers remain visible." />
          <div className="space-y-2">
            {activeJobs.slice(0, 8).map((job) => (
              <div key={job.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-[11px] text-white/68 font-medium">{job.task || job.title}</p>
                    <p className="text-[9px] text-white/22">{job.id} · owner {job.owner || "Perry"} · route {job.routeStatus || "unavailable"}</p>
                  </div>
                  <TruthBadge source="live" />
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[9px] text-white/24">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">status {job.status || "unknown"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">stage {job.stage || "—"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">priority {job.priority || "—"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">source {job.source || "live"}</span>
                </div>
              </div>
            ))}
            {!activeJobs.length && <p className="text-[11px] text-white/25">No live security queue items.</p>}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4">
            <SectionTitle title="Risk posture" source="registry-backed" note="Registry metrics and audit observations stay visible without pretending the data is fuller than it is." />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Infra health", value: system?.counts?.workers ?? 0, source: "live" },
                { label: "Blocked jobs", value: system?.counts?.blockedJobs ?? 0, source: metricStatus === "warning" ? "live" : "registry-backed" },
                { label: "Reports", value: system?.counts?.reports ?? 0, source: "live" },
                { label: "Approvals", value: system?.counts?.approvals ?? 0, source: "live" },
              ].map((metric) => (
                <div key={metric.label} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between gap-2 mb-1"><p className="text-[10px] text-white/25 uppercase tracking-wider">{metric.label}</p><TruthBadge source={metric.source} /></div>
                  <p className="text-[18px] text-white/70 font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Audit log" source="registry-backed" note="Audits and reports are surfaced as records, not decoration." />
            <div className="space-y-2">
              {auditReports.slice(0, 5).map((report, index) => (
                <div key={`${report.title || report.label || index}`} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-[11px] text-white/65 font-medium">{report.title || report.label || "Audit record"}</p>
                      <p className="text-[9px] text-white/22">{report.detail || report.desc || report.updatedAt || "Registry-backed evidence"}</p>
                    </div>
                    <TruthBadge source={report.sourceTruth || "registry-backed"} />
                  </div>
                </div>
              ))}
              {!auditReports.length && <p className="text-[11px] text-white/25">No audit records available.</p>}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <GlassCard className="p-4">
          <SectionTitle title="Compliance / release checks" source="seeded" note="Explicit seeded checks keep the release lane honest until live scan sources are wired." />
          <div className="space-y-2">
            {seededReleaseChecks.map((check) => {
              const Icon = checkIcons[check.label] || Shield;
              return (
                <div key={check.label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <Icon className="w-4 h-4 text-white/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 font-medium">{check.label}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{check.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.status === "pass" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : check.status === "fail" ? <XCircle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    <TruthBadge source="seeded" />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <SectionTitle title="Security actions" source="registry-backed" note="Action notes stay attached to the security surface so the lane reads like an inbox, not a poster." />
          <div className="space-y-2">
            {actions.slice(0, 6).map((action, index) => (
              <div key={`${action.title || action.name || index}`} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-[11px] text-white/65 font-medium">{action.title || action.name || "Security action"}</p>
                    <p className="text-[9px] text-white/22">{action.detail || action.description || "Registry-backed action item"}</p>
                  </div>
                  <TruthBadge source={action.sourceTruth || "registry-backed"} />
                </div>
              </div>
            ))}
            {!actions.length && <p className="text-[11px] text-white/25">No security actions available.</p>}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <SectionTitle title="Runtime and cost safety" source="live" note="Perry can see runtime posture and token/cost telemetry without leaving this surface." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-white/35">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><Activity className="w-4 h-4 text-white/20 mb-2" /><p>Runtime: {runtime?.overallHealth || "unavailable"}</p></div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><Layers className="w-4 h-4 text-white/20 mb-2" /><p>Blocked jobs: {system?.counts?.blockedJobs ?? 0}</p></div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"><Server className="w-4 h-4 text-white/20 mb-2" /><p>Tokens today: {costs?.summary?.todayTotalTokenUse || "unavailable"}</p></div>
        </div>
      </GlassCard>
    </div>
  );
}
