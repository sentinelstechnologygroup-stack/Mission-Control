export function selectTopCandidates(candidates = [], limit = 3) {
  return [...candidates].sort((a, b) => (b.scorecard?.finalRankScore || 0) - (a.scorecard?.finalRankScore || 0)).slice(0, limit)
}
