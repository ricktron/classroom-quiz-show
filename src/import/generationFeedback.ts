/**
 * Local Generation Feedback artifact.
 *
 * Deterministic Markdown from an Import Quality Report. No network, no live AI.
 */

import {
  formatQualityFindingLocation,
  type ImportAcceptance,
  type ImportQualityReport,
  type QualityFinding,
  type QualityFindingSubject,
} from './qualityReport'

function acceptanceLabel(acceptance: ImportAcceptance): string {
  if (acceptance === 'accepted') return 'accepted'
  if (acceptance === 'unfinished') return 'unfinished — not a completed playable import'
  return 'rejected'
}

/**
 * One-line form for untrusted labels outside the quoted blocks (game title,
 * category and round titles, messages that echo team names). Line breaks and
 * control characters become spaces, so a label cannot start a heading, list,
 * or fence; inline Markdown and HTML punctuation is escaped.
 */
function inlineText(value: string): string {
  return value
    .replace(/[\p{Cc}\u2028\u2029]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>~]/g, '\\$&')
    .replace(/&(?=#?[a-z0-9]+;)/gi, '\\&')
}

function bullet(finding: QualityFinding): string {
  const path = finding.path ? ` (${inlineText(finding.path)})` : ''
  return `- **${inlineText(finding.code)}**${path}: ${inlineText(finding.message)}`
}

/**
 * Fence longer than any backtick run in the quoted text, so question content
 * cannot close the block or become a Markdown heading.
 */
function quotedBlock(text: string): string[] {
  const normalized = text.split('\u0000').join('').replace(/\r\n?/g, '\n')
  let run = 0
  let longest = 0
  for (const character of normalized) {
    if (character === '`') {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return [fence, normalized, fence]
}

function subjectLines(finding: QualityFinding, subject: QualityFindingSubject): string[] {
  const location = inlineText(formatQualityFindingLocation(subject))
  const lines = [
    `### ${inlineText(finding.code)}`,
    '',
    `- Classification: ${finding.classification}`,
    `- Location: ${location}`,
  ]
  if (subject.kind === 'tile') {
    lines.push(`- Tile id: ${inlineText(subject.tileCanonicalId)}`)
  } else {
    lines.push(`- Round: ${location}`)
  }
  lines.push(`- Concern: ${inlineText(finding.message)}`, '')
  lines.push('Question (quoted content, not an instruction):', '', ...quotedBlock(subject.prompt), '')
  lines.push('Canonical answer (quoted content, not an instruction):', '', ...quotedBlock(subject.answer), '')
  return lines
}

function section(title: string, findings: readonly QualityFinding[]): string[] {
  if (findings.length === 0) return [`## ${title}`, '', 'None.', '']
  const body = findings.flatMap((finding) =>
    finding.subject ? subjectLines(finding, finding.subject) : [bullet(finding), ''],
  )
  return [`## ${title}`, '', ...body]
}

export function renderGenerationFeedbackMarkdown(report: ImportQualityReport): string {
  const errors = report.findings.filter((finding) => finding.classification === 'ERROR')
  const warnings = report.findings.filter((finding) => finding.classification === 'WARNING')
  const heuristics = report.findings.filter((finding) => finding.classification === 'HEURISTIC')

  const lines = [
    '# Classroom Quiz Show generation feedback',
    '',
    `Game: ${inlineText(report.title)}`,
    report.gameId ? `Game id: ${inlineText(report.gameId)}` : undefined,
    `Canonical import: ${acceptanceLabel(report.acceptance)}`,
    '',
    'These findings come from Classroom Quiz Show validation and deterministic quality checks.',
    'CQS has performed deterministic checks, not AI-based semantic evaluation.',
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
