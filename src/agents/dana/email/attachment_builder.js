import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { ensureDir, writeJson } from '../agents/research/utils.js'

export function buildAttachmentPackage({ runDir, reportFiles = [], mode = 'daily' }) {
  const attachmentDir = ensureDir(path.join(runDir, 'attachments'))
  const archivePath = path.join(attachmentDir, `dana_${mode}_reports.tar.gz`)
  const relativeFiles = reportFiles.map((file) => path.relative(runDir, file))
  if (!relativeFiles.length) {
    const manifest = {
      mode,
      createdAt: new Date().toISOString(),
      archivePath: null,
      archiveCreated: false,
      archiveError: 'no report files to package',
      attachments: [],
    }
    writeJson(path.join(attachmentDir, 'attachments.manifest.json'), manifest)
    return manifest
  }
  const tarResult = spawnSync('tar', ['-czf', archivePath, ...relativeFiles], {
    cwd: runDir,
    encoding: 'utf8',
  })
  const archiveExists = tarResult.status === 0 && fs.existsSync(archivePath)
  const manifest = {
    mode,
    createdAt: new Date().toISOString(),
    archivePath: archiveExists ? archivePath : null,
    archiveCreated: archiveExists,
    archiveError: tarResult.status === 0 ? null : (tarResult.stderr || tarResult.stdout || 'tar failed'),
    attachments: archiveExists ? [archivePath] : reportFiles,
  }
  writeJson(path.join(attachmentDir, 'attachments.manifest.json'), manifest)
  return manifest
}
