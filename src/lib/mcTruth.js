export const TRUTH_VARIANT = {
  live: "active",
  "registry-backed": "info",
  seeded: "warning",
  unavailable: "idle",
  static: "idle",
  demo: "warning",
  fallback: "warning",
  degraded: "warning",
  error: "critical",
};

export function normalizeTruth(value) {
  const text = String(value ?? "unavailable").trim().toLowerCase();
  if (!text) return "unavailable";
  if (text === "registry_backed" || text === "registry backed" || text === "ledger_registry") return "registry-backed";
  if (text === "live" || text === "available") return "live";
  if (text === "seeded" || text === "seed" || text === "demo" || text === "demo-only") return "seeded";
  if (text === "static" || text === "fallback" || text === "offline" || text === "unavailable" || text === "missing") return text === "static" ? "static" : "unavailable";
  if (text === "degraded") return "seeded";
  return text;
}

export function truthVariant(value) {
  return TRUTH_VARIANT[normalizeTruth(value)] || "idle";
}

export function truthLabel(value) {
  return normalizeTruth(value);
}

export function truthClass(value) {
  return TRUTH_VARIANT[normalizeTruth(value)] || "idle";
}

export function arrayify(value) {
  return Array.isArray(value) ? value : [];
}

export function countBy(items, predicate) {
  return arrayify(items).reduce((acc, item) => acc + (predicate(item) ? 1 : 0), 0);
}
