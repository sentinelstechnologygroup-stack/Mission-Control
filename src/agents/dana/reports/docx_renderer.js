import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { formattedReportTemplatesRoot, danaDocxPython } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCRIPT_PATH = path.join(__dirname, 'render_dana_docx.py')

const TEMPLATE_MAP = {
  'INV_Executive_Summary.md': { reportType: 'INV_Executive_Summary', template: 'INV_Executive_Summary_PRINT.docx' },
  'INV_Opportunity_Scorecard.md': { reportType: 'INV_Opportunity_Scorecard', template: 'INV_Opportunity_Scorecard_PRINT.docx' },
  'INV_Stock_Opportunity_Analysis.md': { reportType: 'INV_Stock_Opportunity_Analysis', template: 'INV_Stock_Opportunity_Analysis_PRINT.docx' },
  'INV_Scenario_Analysis.md': { reportType: 'INV_Scenario_Analysis', template: 'INV_Scenario_Analysis_PRINT.docx' },
  'INV_Pricing_Margin_Model.md': { reportType: 'INV_Pricing_Margin_Model', template: 'INV_Pricing_Margin_Model_PRINT.docx' },
  'INV_Capital_Deployment.md': { reportType: 'INV_Capital_Deployment', template: 'INV_Capital_Deployment_PRINT.docx' },
  'INV_Rollup.md': { reportType: 'INV_Rollup', template: 'INV_Rollup_PRINT.docx' },
}

export function docxTemplateInfo(markdownName) {
  return TEMPLATE_MAP[markdownName] || null
}

export function renderDanaDocxReport({ markdownPath, outputPath, contextPath, markdownName }) {
  const info = docxTemplateInfo(markdownName)
  if (!info) {
    return null
  }
  if (!info.template) {
    return null
  }
  const templatePath = path.join(formattedReportTemplatesRoot, info.template)
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Dana docx template not found: ${templatePath}`)
  }
  const python = fs.existsSync(danaDocxPython) ? danaDocxPython : 'python3'
  const result = spawnSync(python, [SCRIPT_PATH, '--template', templatePath, '--output', outputPath, '--report-type', info.reportType, '--context', contextPath, '--markdown', markdownPath], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to render Dana docx report: ${markdownName}`)
  }
  return outputPath
}
