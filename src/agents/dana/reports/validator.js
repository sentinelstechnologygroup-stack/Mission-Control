import { spawnSync } from 'child_process'
import path from 'path'
import { reportPackRoot } from '../config/paths.js'

export function validateReportFiles(reportFiles = []) {
  const validator = path.join(reportPackRoot, 'validate_dana_reports.py')
  const args = [...reportFiles]
  const result = spawnSync('python3', [validator, ...args], { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    command: `python3 ${validator} ${args.join(' ')}`,
  }
}
