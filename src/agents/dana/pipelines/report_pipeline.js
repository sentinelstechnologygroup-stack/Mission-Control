import { generateReportRunArtifacts } from '../agents/research/report_pipeline.js'

export function runReportPipeline(input = {}) {
  return generateReportRunArtifacts(input)
}
