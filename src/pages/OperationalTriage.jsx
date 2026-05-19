import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Database,
  FileWarning,
  Layers3,
  Lock,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";
import { api } from "@/lib/api";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";

function sectionTitle(icon, title, subtitle) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-white/60">{icon}</div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{title}</p>
        {subtitle ? <p className="text-[10px] text-white/25">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function metricCard(label, value, detail, variant = "info") {
  return (
    <GlassCard className="border border-white/[0.06] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-wider text-white/25">{label}</p>
        <StatusBadge variant={variant} dot={false}>{variant}</StatusBadge>
      </div>
      <p className="text-[20px] font-semibold text-white/80">{value}</p>
      <p className="mt-1 text-[10px] text-white/25">{detail}</p>
    </GlassCard>
  );
}

export default function OperationalTriage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["triage", "summary"],
    queryFn: api.triageSummary,
    refetchInterval: 10000,
  });

  const triage = data || {};
  const queuePressure = triage.queuePressure || {};
  const reconciliation = triage.reconciliation || {};
  const lockGovernance = triage.lockGovernance || {};
  const blockerBreakdown = triage.blockerBreakdown || [];
  const artifactFreshness = triage.artifactFreshness || {};
  const runtimeHealth = triage.runtimeHealth || {};
  const alignment = reconciliation.sourceCounts || {};
  const truthVariant = isError ? "critical" : triage.truthStatus === "DEGRADED" ? "warning" : "active";

  return (
    <div className="space-y-4">
      <GlassCard className="border border-white/[0.06]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-cyan-300/80">Operational Triage Center</p>
            </div>
            <h1 className="text-[24px] font-semibold text-white/85">Runtime reconciliation authority</h1>
            <p className="mt-1 text-[11px] text-white/35">Read-only operational truth for queue drift, blocker taxonomy, lock pressure, stale debt, and operator next actions.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metricCard("Runtime", runtimeHealth.overallHealth || (isLoading ? "Loading" : "Unknown"), triage.updatedAt || "No timestamp", truthVariant)}
            {metricCard("Truth", triage.truthStatus || (isLoading ? "Loading" : "Unknown"), reconciliation.overallStatus || "No reconciliation verdict", truthVariant)}
            {metricCard("Queue", `${queuePressure.queued ?? 0}/${queuePressure.blocked ?? 0}`, "queued / blocked", queuePressure.activeWorkMismatch ? "warning" : "info")}
            {metricCard("Reconciliation", reconciliation.overallStatus || "Unknown", `${(reconciliation.mismatches || []).length} mismatches`, (reconciliation.impossibleStates || []).length ? "critical" : "info")}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<Layers3 className="h-4 w-4" />, "Queue Pressure", "Running, queued, blocked, stale, completed, and active-work drift")}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {metricCard("Running", queuePressure.running ?? 0, "live running work", "active")}
            {metricCard("Queued", queuePressure.queued ?? 0, "awaiting execution", "warning")}
            {metricCard("Blocked", queuePressure.blocked ?? 0, "needs triage", queuePressure.blocked ? "critical" : "info")}
            {metricCard("Stale", queuePressure.stale ?? 0, "stale debt", queuePressure.stale ? "warning" : "info")}
            {metricCard("Completed", queuePressure.completed ?? 0, "recently completed", "info")}
            {metricCard("Mismatch", queuePressure.activeWorkMismatch ? "YES" : "NO", "active-work mismatch indicator", queuePressure.activeWorkMismatch ? "critical" : "active")}
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<ShieldAlert className="h-4 w-4" />, "Blocker Breakdown", "Canonical blocker taxonomy with examples and recommended action")}
          <div className="space-y-3">
            {blockerBreakdown.length ? blockerBreakdown.map((group) => (
              <div key={group.blockerClass} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={group.severity === "high" ? "critical" : group.severity === "medium" ? "warning" : "info"} dot={false}>{group.blockerClass}</StatusBadge>
                    <span className="text-[10px] text-white/35">{group.count} jobs</span>
                  </div>
                  <span className="text-[9px] text-white/20">{group.recommendedAction}</span>
                </div>
                <div className="space-y-1.5">
                  {(group.examples || []).slice(0, 3).map((example) => (
                    <div key={example.jobId} className="rounded-lg bg-black/20 px-2 py-2 text-[10px] text-white/45">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-white/60">{example.jobId}</span>
                        <span>{example.owner}</span>
                      </div>
                      <p className="mt-1 text-white/45">{example.task}</p>
                      <p className="mt-1 text-white/25">{example.blockerReason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )) : <p className="text-[11px] text-white/30">No blocker breakdown available.</p>}
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<Workflow className="h-4 w-4" />, "Reconciliation Panel", "Mismatches, duplicates, orphan jobs, impossible states, and safe auto-fixes")}
          <div className="space-y-3 text-[10px] text-white/45">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metricCard("Mismatches", (reconciliation.mismatches || []).length, "source disagreements", (reconciliation.mismatches || []).length ? "warning" : "active")}
              {metricCard("Orphans", (reconciliation.orphanJobs || []).length, "missing durable ledger pairing", (reconciliation.orphanJobs || []).length ? "critical" : "info")}
              {metricCard("Duplicates", (reconciliation.duplicateJobs || []).length, "open duplicate clusters", (reconciliation.duplicateJobs || []).length ? "warning" : "info")}
              {metricCard("Impossible", (reconciliation.impossibleStates || []).length, "multi-bucket or terminal/open conflicts", (reconciliation.impossibleStates || []).length ? "critical" : "active")}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] uppercase tracking-wider text-white/25">Safe auto-fixes available</p>
              <div className="flex flex-wrap gap-2">
                {(reconciliation.safeAutoFixesAvailable || []).length ? (reconciliation.safeAutoFixesAvailable || []).map((item) => (
                  <StatusBadge key={item} variant="info" dot={false}>{item}</StatusBadge>
                )) : <span className="text-[10px] text-white/30">None</span>}
              </div>
              <p className="mt-3 text-[10px] text-white/25">Human approval required: {reconciliation.requiresHumanApproval ? "Yes" : "No"}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<Lock className="h-4 w-4" />, "Lock Conflict Panel", "Active conflicts, stale locks, affected jobs, and owners")}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metricCard("Active Locks", (lockGovernance.activeLocks || []).length, "live lock holders", "info")}
            {metricCard("Conflicts", (lockGovernance.lockConflicts || []).length, "lock pressure", (lockGovernance.lockConflicts || []).length ? "critical" : "active")}
            {metricCard("Stale Locks", (lockGovernance.staleLocks || []).length, "expired lock metadata", (lockGovernance.staleLocks || []).length ? "warning" : "active")}
            {metricCard("Owners", (lockGovernance.owners || []).length, "unique lock owners", "info")}
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[10px] text-white/40">
            <p className="mb-2 text-[9px] uppercase tracking-wider text-white/25">Recommended action</p>
            <ul className="space-y-1">
              {(lockGovernance.recommendedActions || []).map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<Clock3 className="h-4 w-4" />, "Stale Debt Panel", "Stale jobs, stale reports, stale artifacts, and snapshot debt")}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metricCard("Jobs", (triage.staleJobs || []).length, "stale runtime jobs", (triage.staleJobs || []).length ? "warning" : "active")}
              {metricCard("Reports", (triage.staleReports || []).length, "stale reports", (triage.staleReports || []).length ? "warning" : "active")}
              {metricCard("Artifacts", (artifactFreshness.staleArtifacts || []).length, "stale artifacts", (artifactFreshness.staleArtifacts || []).length ? "warning" : "active")}
              {metricCard("Orphans", (triage.orphanJobs || []).length, "orphan runtime records", (triage.orphanJobs || []).length ? "critical" : "active")}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<Sparkles className="h-4 w-4" />, "Operator Next Actions", "Ranked actions with severity, owner, and approval needs")}
          <div className="space-y-2">
            {(triage.operatorRecommendations || []).length ? triage.operatorRecommendations.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <StatusBadge variant={index === 0 ? "critical" : index < 3 ? "warning" : "info"} dot={false}>P{index + 1}</StatusBadge>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/65">{item}</p>
                  <p className="mt-1 text-[9px] text-white/25">Patrick approval required: {reconciliation.requiresHumanApproval && index === 0 ? "Likely" : "No routine approval signal"}</p>
                </div>
              </div>
            )) : <p className="text-[11px] text-white/30">No operator recommendations available.</p>}
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06]">
          {sectionTitle(<AlertTriangle className="h-4 w-4" />, "Active Incidents", "Runtime degraded, cooldowns, auth failures, CI/report failures, and queue deadlocks")}
          <div className="space-y-2">
            {(triage.activeIncidents || []).length ? triage.activeIncidents.map((item) => (
              <div key={item} className="rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-[11px] text-red-300/80">{item}</div>
            )) : <p className="text-[11px] text-white/30">No active incidents detected.</p>}
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06] xl:col-span-2">
          {sectionTitle(<FileWarning className="h-4 w-4" />, "Artifact Freshness", "Newest artifacts, stale artifacts, unlinked artifacts, and report freshness")}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] uppercase tracking-wider text-white/25">Newest artifacts</p>
              <div className="space-y-2">
                {(artifactFreshness.newestArtifacts || []).length ? artifactFreshness.newestArtifacts.map((artifact) => (
                  <div key={artifact.id} className="flex items-center justify-between gap-3 text-[10px] text-white/45">
                    <span>{artifact.title}</span>
                    <span className="font-mono text-white/25">{artifact.updatedAt || "—"}</span>
                  </div>
                )) : <p className="text-[10px] text-white/30">No artifacts tracked.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] uppercase tracking-wider text-white/25">Stale artifacts</p>
              <div className="space-y-2">
                {(artifactFreshness.staleArtifacts || []).length ? artifactFreshness.staleArtifacts.map((artifact) => (
                  <div key={artifact.id} className="flex items-center justify-between gap-3 text-[10px] text-white/45">
                    <span>{artifact.title}</span>
                    <span className="font-mono text-white/25">{artifact.updatedAt || "—"}</span>
                  </div>
                )) : <p className="text-[10px] text-white/30">No stale artifacts tracked.</p>}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-white/[0.06] xl:col-span-2">
          {sectionTitle(<Database className="h-4 w-4" />, "Raw Source Alignment", "Immediate comparison of ledger, registry, active-work, and queue summary")}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metricCard("Ledger", alignment.ledgerTotal ?? 0, "durable jobs ledger", "info")}
            {metricCard("Registry", alignment.registryTotal ?? 0, "merged work registry", "info")}
            {metricCard("Active Work", alignment.activeWorkTotal ?? 0, "active-work endpoint", queuePressure.activeWorkMismatch ? "warning" : "active")}
            {metricCard("Queue", `${alignment.queued ?? 0}/${alignment.running ?? 0}/${alignment.blocked ?? 0}`, "queued / running / blocked", "info")}
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="mb-2 text-[9px] uppercase tracking-wider text-white/25">Mismatches</p>
            <div className="space-y-1">
              {(reconciliation.mismatches || []).length ? reconciliation.mismatches.map((item, index) => (
                <div key={`${item.type}-${index}`} className="flex items-center justify-between gap-2 text-[10px] text-white/40">
                  <span>{item.type}</span>
                  <ArrowUpRight className="h-3 w-3 text-white/15" />
                </div>
              )) : <p className="text-[10px] text-white/30">No source mismatches detected.</p>}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
