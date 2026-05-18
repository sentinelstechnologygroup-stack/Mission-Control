# Runtime Status Taxonomy

LIVE
- Real connected source
- Current data within freshness threshold
- Operationally trustworthy
- Use normal operator confidence

FALLBACK
- Temporary seeded or backup data because live source unavailable
- Must be visibly labeled
- Operator should treat as degraded context, not current truth

STATIC
- Hardcoded/demo/manual placeholder
- Not runtime-connected
- Must not be implied as live

STALE
- Real source exists but freshness threshold exceeded
- Data may be historically useful but not current operational truth

DEGRADED
- Partial functionality or partial data failure
- Some source connected, but integrity/coverage reduced

ERROR
- Retrieval failed or invalid state returned
- Operator action likely required

SIMULATED
- Intentionally synthetic/testing data
- Acceptable only for explicit simulation/testing contexts

DISCONNECTED
- Runtime source unavailable entirely
- No current operational truth available from that source

UNKNOWN
- Source state not yet validated
- Use only until audit/verification completes
