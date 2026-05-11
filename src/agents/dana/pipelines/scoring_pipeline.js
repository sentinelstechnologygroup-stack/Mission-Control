import { scoreCandidates } from '../agents/research/scoring_engine.js'
import { isVerificationApproved } from '../agents/research/secondary_verification.js'

export function runScoringPipeline(candidates = []) {
  const verified = candidates.filter((candidate) => isVerificationApproved(candidate))
  return scoreCandidates(verified)
}
