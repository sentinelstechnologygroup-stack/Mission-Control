import fs from 'fs'
import path from 'path'
import { reportPackRoot } from '../config/paths.js'

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractPlaceholders(templateText) {
  const found = new Set()
  for (const match of templateText.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)) {
    found.add(match[1])
  }
  return [...found]
}

function buildStructureRegex(templateText) {
  let pattern = '^'
  let lastIndex = 0
  const placeholderRe = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g
  let match
  while ((match = placeholderRe.exec(templateText)) !== null) {
    pattern += escapeRegex(templateText.slice(lastIndex, match.index))
    pattern += '([\\s\\S]+?)'
    lastIndex = match.index + match[0].length
  }
  pattern += escapeRegex(templateText.slice(lastIndex))
  pattern += '$'
  return new RegExp(pattern)
}

export function resolveDanaTemplatePath(templateName) {
  const templatePath = path.join(reportPackRoot, templateName)
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Dana report template not found: ${templatePath}`)
  }
  return templatePath
}

export function loadDanaTemplate(templateName) {
  const templatePath = resolveDanaTemplatePath(templateName)
  const templateText = fs.readFileSync(templatePath, 'utf8')
  return { templatePath, templateText, placeholders: extractPlaceholders(templateText) }
}

export function renderDanaTemplate(templateName, values = {}, options = {}) {
  const { requiredPlaceholders = [], validateStructure = true } = options
  const { templateText, placeholders } = loadDanaTemplate(templateName)
  const missingTemplatePlaceholders = requiredPlaceholders.filter((name) => !placeholders.includes(name))
  if (missingTemplatePlaceholders.length) {
    throw new Error(`Dana template ${templateName} is missing required placeholders: ${missingTemplatePlaceholders.join(', ')}`)
  }
  const missingValues = placeholders.filter((name) => values[name] === undefined || values[name] === null)
  if (missingValues.length) {
    throw new Error(`Dana template ${templateName} is missing values for: ${missingValues.join(', ')}`)
  }

  const rendered = templateText.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => String(values[key]))
  if (/{{\s*[a-zA-Z0-9_.-]+\s*}}/.test(rendered)) {
    const unresolved = [...rendered.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)].map((match) => match[1])
    throw new Error(`Dana template ${templateName} has unresolved placeholders after render: ${unresolved.join(', ')}`)
  }
  if (validateStructure) {
    const structure = buildStructureRegex(templateText)
    if (!structure.test(rendered)) {
      throw new Error(`Rendered Dana report ${templateName} deviates from locked template structure`)
    }
  }
  return rendered
}

export function templateFields(templateName) {
  return loadDanaTemplate(templateName).placeholders
}
