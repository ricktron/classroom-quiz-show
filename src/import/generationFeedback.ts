/**
 * Local Generation Feedback artifact.
 *
 * Deterministic Markdown from an Import Quality Report. No network, no live AI.
 */

import type { ImportQualityReport, QualityFinding } from './qualityReport'

function section(title: string, findings: readonly QualityFinding[]): string[] {
  if (findings.length === 0) return [`## ${title}`, '', 'None.', '']
  return [
    `## ${title}`,
    '',
    ...findings.map((finding) => `- **${finding.code}**${finding.path ? ` (${finding.path})` : ''}: ${finding.message}`),
    '',
  ]
}

export function renderGenerationFeedbackMarkdown(report: ImportQualityReport): string {
  const errors = report.findings.filter((finding) => finding.classification === 'ERROR')
  const warnings = report.findings.filter((finding) => finding.classification === 'WARNING')
  const heuristics = report.findings.filter((finding) => finding.classification === 'HEURISTIC')

  const lines = [
    '# Classroom Quiz Show generation feedback',
    '',
    `Game: ${report.title}`,
    report.gameId ? `Game id: ${report.gameId}` : undefined,
    `Canonical import: ${report.importSucceeded ? 'accepted' : 'rejected'}`,
    '',
    'These findings come from Classroom Quiz Show validation and deterministic quality checks.',
    'They are not AI judgments. Use them when writing the next workbook-generation prompt.',
    '',
    ...section('Errors', errors),
    ...section('Warnings', warnings),
    ...section('Quality notices', heuristics),
    'Do not treat quality notices as proven semantic errors.',
    '',
  ].filter((line): line is string => line !== undefined)

  return `${lines.join('\n')}\n`
}

export function generationFeedbackFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${slug || 'game'}-generation-feedback.md`
}
