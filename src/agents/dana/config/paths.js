import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const projectRoot = path.resolve(__dirname, '../../../..')
export const danaRoot = path.join(projectRoot, 'src/agents/dana')
export const runtimeRoot = path.join(projectRoot, 'runtime')
export const danaRuntimeRoot = path.join(runtimeRoot, 'dana')
export const danaReportsRoot = path.join(danaRuntimeRoot, 'reports')
export const danaAttachmentsRoot = path.join(danaRuntimeRoot, 'attachments')
export const danaLogsRoot = path.join(danaRuntimeRoot, 'logs')
export const danaRunsRoot = path.join(danaRuntimeRoot, 'runs')
export const reportPackRoot = path.resolve('/home/patrick/projects/dana-finance-report-pack')
export const formattedReportTemplatesRoot = path.resolve('/home/patrick/dana_formatted_report_templates')
export const danaDocxPython = path.join(projectRoot, '.venv-docx', 'bin', 'python')

export function resolveDanaPath(...parts) {
  return path.join(danaRoot, ...parts)
}

export function resolveRuntimeDanaPath(...parts) {
  return path.join(danaRuntimeRoot, ...parts)
}

export function ensureDanaDirs() {
  for (const dir of [danaRuntimeRoot, danaReportsRoot, danaAttachmentsRoot, danaLogsRoot, danaRunsRoot]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
