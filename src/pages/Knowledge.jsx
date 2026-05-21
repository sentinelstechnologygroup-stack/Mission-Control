import { useEffect, useMemo, useState } from "react";
import SubTabBar from "../components/mission-control/SubTabBar";
import GlassCard from "../components/mission-control/GlassCard";
import StatusBadge from "../components/mission-control/StatusBadge";
import TruthBadge from "../components/mission-control/TruthBadge";
import EmptyState from "../components/mission-control/EmptyState";
import { fetchJson } from "../lib/jsonFetch";
import { arrayify } from "../lib/mcTruth";
import { FileText, Brain, Search, BookOpen, ShieldCheck, Layers, Activity } from "lucide-react";

const tabs = [
  { id: "registry", label: "Registry" },
  { id: "docs", label: "Docs / Canon" },
  { id: "evidence", label: "Evidence" },
  { id: "search", label: "Search" },
];

const seededDocs = [
  { title: "Agent Operating Doctrine v3", type: "doctrine", status: "canonical", updated: "2d ago", owner: "Nettie" },
  { title: "Security Policy — Production", type: "policy", status: "canonical", updated: "5d ago", owner: "Within Core" },
  { title: "Brand Voice Guidelines", type: "policy", status: "canonical", updated: "1w ago", owner: "Torina" },
  { title: "Deployment Runbook", type: "artifact", status: "canonical", updated: "1w ago", owner: "Van" },
  { title: "Agent Autonomy Levels", type: "doctrine", status: "canonical", updated: "2w ago", owner: "Patrick" },
];

const typeIcons = { doctrine: BookOpen, policy: FileText, artifact: FileText, report: FileText };
const statusVariants = { canonical: "active", approved: "info", "in review": "warning" };

function SectionTitle({ title, source, note }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</h2>
        {note ? <p className="text-[10px] text-white/22 mt-1">{note}</p> : null}</div>
      <TruthBadge source={source} />
    </div>
  );
}

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState("registry");
  const [searchQuery, setSearchQuery] = useState("");
  const [docsFilter, setDocsFilter] = useState("all");
  const [agents, setAgents] = useState([]);
  const [workflows, setWorkflows] = useState({ departments: [] });
  const [runtime, setRuntime] = useState(null);
  const [system, setSystem] = useState(null);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [agentData, workflowData, runtimeData, systemData, costData] = await Promise.all([
          fetchJson("/api/agents", { signal: controller.signal }),
          fetchJson("/api/departments/workflows", { signal: controller.signal }),
          fetchJson("/api/runtime", { signal: controller.signal }),
          fetchJson("/api/system", { signal: controller.signal }),
          fetchJson("/api/costs", { signal: controller.signal }),
        ]);
        setAgents(arrayify(agentData));
        setWorkflows(workflowData || { departments: [] });
        setRuntime(runtimeData || null);
        setSystem(systemData || null);
        setCosts(costData || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to load knowledge registry");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const workflowSkills = useMemo(() => arrayify(workflows?.departments).flatMap((dept) => (dept.workflowTemplates || []).map((template) => ({
    title: template.name,
    owner: dept.name,
    status: dept.demoOnly ? "seeded" : (dept.sourceTruth || "registry-backed"),
    description: template.description,
    detail: `${template.nodeChain?.length ?? 0} nodes · queue ${dept.activeQueueCount ?? 0}`,
  }))), [workflows]);

  const agentPermissions = useMemo(() => agents.flatMap((agent) => (agent.permissions || []).map((perm) => ({
    title: `${agent.displayName} permission`,
    owner: agent.roleTitle,
    source: agent.heartbeat?.status === "live" ? "registry-backed" : "seeded",
    description: perm,
    detail: agent.domainOwnership || agent.focus || "Operational permission",
  }))), [agents]);

  const filteredDocs = seededDocs.filter((doc) => docsFilter === "all" || doc.type === docsFilter);
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return [...seededDocs, ...workflowSkills, ...agentPermissions].filter((item) => [item.title, item.owner, item.description, item.detail].filter(Boolean).some((value) => String(value).toLowerCase().includes(q))).slice(0, 20);
  }, [agentPermissions, searchQuery, workflowSkills]);

  const docsCount = seededDocs.length;
  const registryCount = workflowSkills.length + agentPermissions.length + agents.length;
  const evidenceCount = (system?.counts?.reports ?? 0) + (system?.counts?.jobs ?? 0) + arrayify(workflows?.departments).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 mb-1">Knowledge</h1>
          <p className="text-[11px] text-white/30">Skill, docs, and evidence registry — live truth first, canon second, seeded only when labeled</p>
        </div>
        <TruthBadge source={error ? "unavailable" : "live"} />
      </div>

      {(loading || error) && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TruthBadge source={error ? "unavailable" : "live"} />
            <p className="text-[11px] text-white/35">{error ? error : "Loading knowledge registry…"}</p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Seeded canon docs", value: docsCount, source: "seeded", hint: "Explicit docs and runbooks" },
          { label: "Registry records", value: registryCount, source: "registry-backed", hint: "Skills and permissions from agent/workflow registry" },
          { label: "Evidence records", value: evidenceCount, source: "live", hint: "Jobs, reports, and department evidence" },
          { label: "Runtime posture", value: runtime?.overallHealth || "unavailable", source: "live", hint: `Confidence ${runtime?.operationalConfidence?.label || "unknown"}` },
        ].map((card) => (
          <GlassCard key={card.label} className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] text-white/25 uppercase tracking-wider">{card.label}</p>
              <TruthBadge source={card.source} />
            </div>
            <p className="text-[18px] font-semibold text-white/75 mb-1 break-words">{card.value}</p>
            <p className="text-[10px] text-white/30">{card.hint}</p>
          </GlassCard>
        ))}
      </div>

      <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "registry" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
          <GlassCard className="p-4">
            <SectionTitle title="Skill registry" source="registry-backed" note="Workflow templates and agent permissions are treated as registry records." />
            <div className="space-y-2">
              {workflowSkills.slice(0, 8).map((item) => {
                const Icon = BookOpen;
                return (
                  <div key={item.title} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] text-white/65 font-medium">{item.title}</p>
                          <p className="text-[9px] text-white/22">owner {item.owner}</p>
                        </div>
                      </div>
                      <TruthBadge source={item.status} />
                    </div>
                    <p className="text-[10px] text-white/35 leading-relaxed mb-2">{item.description}</p>
                    <p className="text-[9px] text-white/22">{item.detail}</p>
                  </div>
                );
              })}
              {!workflowSkills.length && <p className="text-[11px] text-white/25">No registry-backed skills found.</p>}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Agent permission ledger" source="registry-backed" note="Operational permissions are visible as durable knowledge, not hidden in prose." />
            <div className="space-y-2">
              {agentPermissions.slice(0, 8).map((item) => (
                <div key={`${item.title}-${item.description}`} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-[11px] text-white/65 font-medium">{item.title}</p>
                      <p className="text-[9px] text-white/22">{item.owner}</p>
                    </div>
                    <TruthBadge source={item.source} />
                  </div>
                  <p className="text-[10px] text-white/35 leading-relaxed">{item.description}</p>
                  <p className="text-[9px] text-white/22 mt-1">{item.detail}</p>
                </div>
              ))}
              {!agentPermissions.length && <p className="text-[11px] text-white/25">No permission records available.</p>}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "docs" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "doctrine", "policy", "artifact", "report"].map((t) => (
              <button key={t} onClick={() => setDocsFilter(t)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${docsFilter === t ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]"}`}>
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredDocs.map((doc, i) => {
              const Icon = typeIcons[doc.type] || FileText;
              return (
                <GlassCard key={i} hover delay={i * 0.03} className="p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white/65 font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/20">{doc.owner}</span>
                        <span className="text-[9px] text-white/10">·</span>
                        <span className="text-[9px] text-white/20">{doc.updated}</span>
                      </div>
                    </div>
                    <StatusBadge variant={statusVariants[doc.status]} dot={false}>{doc.status}</StatusBadge>
                    <TruthBadge source="seeded" />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "evidence" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
          <GlassCard className="p-4">
            <SectionTitle title="Runtime evidence" source="live" note="Operational state from live runtime, system, and cost telemetry." />
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-white/25 uppercase tracking-wider">Runtime health</p><TruthBadge source="live" /></div>
                <p className="text-[11px] text-white/60">{runtime?.overallHealth || "unavailable"} · confidence {runtime?.operationalConfidence?.label || "unknown"}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-white/25 uppercase tracking-wider">System counts</p><TruthBadge source="live" /></div>
                <p className="text-[11px] text-white/60">jobs {system?.counts?.jobs ?? 0} · blocked {system?.counts?.blockedJobs ?? 0} · reports {system?.counts?.reports ?? 0}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-white/25 uppercase tracking-wider">Cost telemetry</p><TruthBadge source="live" /></div>
                <p className="text-[11px] text-white/60">{costs?.summary?.todayTotalTokenUse || "unavailable"} today · active model {costs?.summary?.activeModel || "unavailable"}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle title="Evidence registry index" source="registry-backed" note="Departments and agents provide the index for workflow evidence and capabilities." />
            <div className="space-y-2">
              {arrayify(workflows?.departments).slice(0, 6).map((dept) => (
                <div key={dept.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-[11px] text-white/65 font-medium">{dept.name}</p>
                      <p className="text-[9px] text-white/22">{dept.title}</p>
                    </div>
                    <TruthBadge source={dept.demoOnly ? "seeded" : (dept.sourceTruth || "registry-backed")} />
                  </div>
                  <p className="text-[10px] text-white/35">{dept.workflowTemplates?.length ?? 0} templates · {dept.activeQueueCount ?? 0} queued · {dept.blockedItems ?? 0} blocked</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "search" && (
        <div className="max-w-2xl mx-auto">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registry skills, docs, evidence, and owners..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl pl-10 pr-4 py-3 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
          </div>
          {!searchQuery && (
            <EmptyState icon={Search} title="Search the knowledge registry" description="Query seeded canon, registry-backed skills, and live evidence summaries." />
          )}
          {searchQuery && (
            <div className="space-y-2">
              {searchResults.map((item, i) => (
                <GlassCard key={`${item.title}-${i}`} hover className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-white/20" />
                    <p className="text-[11px] text-white/60 font-medium">{item.title}</p>
                    <span className="text-[9px] text-white/15 ml-auto">{item.owner || item.source || item.status}</span>
                  </div>
                </GlassCard>
              ))}
              {!searchResults.length && <p className="text-[11px] text-white/25">No registry matches found.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
