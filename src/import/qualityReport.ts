/**
 * Deterministic Import Quality Report.
 *
 * Classifies existing validator output plus a small set of heuristic notices.
 * Does not repair imports, does not call a network, and does not claim AI.
 * Corrupt-file salvage, when it is possible, lives in `salvage.ts` and still
 * ends at this report plus canonical validation. This module never invents
 * academic content.
 */

import type { AuthoringDraft, DraftClue } from '../authoring/types'
import type { AuthoringIssue } from '../authoring/issues'
import type { ImportIssue } from './issues'
import type { ImportResult } from './result'

export const QUALITY_CLASSIFICATIONS = ['ERROR', 'WARNING', 'HEURISTIC'] as const
export type QualityClassification = (typeof QUALITY_CLASSIFICATIONS)[number]
export const IMPORT_ACCEPTANCE = ['accepted', 'rejected', 'unfinished'] as const
export type ImportAcceptance = (typeof IMPORT_ACCEPTANCE)[number]

/**
 * Question context copied from the draft that produced a finding.
 * Presentation uses this instead of decoding a canonical id.
 */
export type QualityFindingSubject =
  | {
      readonly kind: 'tile'
      readonly categoryTitle: string
      readonly clueOrder: number
      readonly tileCanonicalId: string
      readonly prompt: string
      readonly answer: string
      /** Omitted when the draft did not author a point value. */
      readonly pointValue?: number
    }
  | {
      readonly kind: 'final'
      readonly roundTitle: string
      readonly prompt: string
      readonly answer: string
    }

export interface QualityFinding {
  readonly classification: QualityClassification
  readonly code: string
  readonly message: string
  readonly path?: string
  readonly source: 'canonical-import' | 'authoring-draft' | 'heuristic'
  readonly subject?: QualityFindingSubject
}

export interface ImportQualityReport {
  readonly title: string
  readonly gameId?: string
  readonly acceptance: ImportAcceptance
  readonly importSucceeded: boolean
  readonly findings: readonly QualityFinding[]
  readonly errorCount: number
  readonly warningCount: number
  readonly heuristicCount: number
}

const GENERIC_NAME = /^(team\s*\d+|red|blue|green|yellow|orange|purple|pink|player\s*\d+|untitled|category\s*\d+|new game)$/i

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function sortFindings(findings: readonly QualityFinding[]): QualityFinding[] {
  const rank: Record<QualityClassification, number> = { ERROR: 0, WARNING: 1, HEURISTIC: 2 }
  return [...findings].sort((a, b) => {
    const classification = rank[a.classification] - rank[b.classification]
    if (classification !== 0) return classification
    const code = a.code.localeCompare(b.code)
    if (code !== 0) return code
    return (a.path ?? '').localeCompare(b.path ?? '')
  })
}

function fromImportIssue(issue: ImportIssue): QualityFinding {
  return {
    classification: 'ERROR',
    code: issue.code,
    message: issue.message,
    path: issue.path,
    source: 'canonical-import',
  }
}

function fromAuthoringIssue(issue: AuthoringIssue): QualityFinding {
  return {
    classification: issue.severity === 'blocker' ? 'ERROR' : 'WARNING',
    code: issue.code,
    message: issue.message,
    path: issue.draftPath ?? issue.canonicalPath ?? issue.field,
    source: 'authoring-draft',
  }
}

function heuristic(
  code: string,
  message: string,
  path?: string,
  subject?: QualityFindingSubject,
): QualityFinding {
  return {
    classification: 'HEURISTIC',
    code,
    message,
    path,
    source: 'heuristic',
    ...(subject ? { subject } : {}),
  }
}

const ANSWER_LEAKAGE_MESSAGE =
  'The answer appears directly in the question text. Review whether this is intentional.'

const LEAKAGE_MIN_ANSWER_LENGTH = 4
const CHOICE_WORD_LIMIT = 8

/**
 * Whole-word / whole-phrase form used only by the leakage heuristic.
 * Punctuation becomes spacing so "solid," and "solid" compare equally,
 * while "rain" does not match inside "rainbow".
 */
function normalizeLeakageText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/ +/g, ' ')
}

function containsWordSequence(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false
  return ` ${haystack} `.includes(` ${needle} `)
}

function leakageKey(value: string): string {
  return normalizeLeakageText(value).replace(/^(?:a|an|the) /, '')
}

function optionMatchesAnswer(option: string, answer: string): boolean {
  const optionKey = leakageKey(option)
  const answerKey = leakageKey(answer)
  return optionKey.length > 0 && optionKey === answerKey
}

function isShortChoiceLabel(value: string): boolean {
  // A sentence break means prompt text after the list was swallowed into an option.
  if (/[.?!]\s+\S/.test(value)) return false
  const words = value.trim().split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0 || words.length > CHOICE_WORD_LIMIT) return false
  return !words.some((word) => /^(?:is|are|was|were|includes|means)$/i.test(word.replace(/[^a-z]/gi, '')))
}

function disclosesAnswer(normalizedPrompt: string, normalizedAnswer: string): boolean {
  const cues = [
    `the answer is ${normalizedAnswer}`,
    `the correct answer is ${normalizedAnswer}`,
    `the right answer is ${normalizedAnswer}`,
  ]
  return cues.some((cue) => containsWordSequence(normalizedPrompt, cue))
}

interface RecognizedChoice {
  readonly options: readonly string[]
  /** Prompt text outside the recognized options. */
  readonly outside: string
}

function parseCommaChoiceList(tail: string): string[] | null {
  if (!tail.includes(',') || !/\b(?:or|and)\b/i.test(tail)) return null
  let parts = tail
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length === 2 && /\s+\b(?:or|and)\b\s+/i.test(parts[1] ?? '')) {
    const split = (parts[1] ?? '').split(/\s+\b(?:or|and)\b\s+/i)
    if (split.length === 2) parts = [parts[0] ?? '', split[0] ?? '', split[1] ?? '']
  }
  if (parts.length < 3) return null
  const options = parts.map((part) => part.replace(/^(?:or|and)\s+/i, '').trim())
  if (options.some((option) => !isShortChoiceLabel(option) || /\b(?:or|and)\b/i.test(option))) return null
  return options
}

function looksLikeChoicePrompt(prompt: string): boolean {
  return prompt.includes('?') || /\b(?:which|choose|select|pick|either)\b/i.test(prompt)
}

function isChoicePair(left: string, right: string): boolean {
  return ![left, right].some((option) => /\bor\b/i.test(option) || !isShortChoiceLabel(option))
}

function colonChoice(prompt: string): RecognizedChoice | null {
  if (!looksLikeChoicePrompt(prompt)) return null
  // A colon, em dash, or en dash introduces the option list.
  const delimiter = Math.max(prompt.lastIndexOf(':'), prompt.lastIndexOf('—'), prompt.lastIndexOf('–'))
  if (delimiter < 0) return null
  const tail = prompt
    .slice(delimiter + 1)
    .replace(/^[ \t]+/, '')
    .replace(/[?.!\s]+$/g, '')
    .trim()
  if (tail.length === 0) return null
  const listed = parseCommaChoiceList(tail)
  if (listed) return { options: listed, outside: prompt.slice(0, delimiter) }
  const pair = tail.match(/^(.+?)\s+or\s+(.+)$/i)
  if (!pair) return null
  const left = pair[1]?.trim() ?? ''
  const right = pair[2]?.trim() ?? ''
  if (left.includes(',') || right.includes(',') || !isChoicePair(left, right)) return null
  return { options: [left, right], outside: prompt.slice(0, delimiter) }
}

function letteredChoice(prompt: string): RecognizedChoice | null {
  const marker = /(?:^|\s)(?:\(([A-Da-d])\)|([A-Da-d])[.)])\s+/g
  const markers: Array<{ index: number; end: number }> = []
  for (const match of prompt.matchAll(marker)) {
    // Options must be lettered in order from A, so prose such as "plan B." is not a list.
    const letter = (match[1] ?? match[2] ?? '').toLowerCase()
    if (letter !== 'abcd'[markers.length]) return null
    markers.push({ index: match.index, end: match.index + match[0].length })
  }
  if (markers.length < 2) return null
  const options: string[] = []
  for (let index = 0; index < markers.length; index += 1) {
    const start = markers[index]?.end ?? 0
    const end = markers[index + 1]?.index ?? prompt.length
    const text = prompt.slice(start, end).replace(/[?.!\s]+$/g, '').trim()
    if (!isShortChoiceLabel(text)) return null
    options.push(text)
  }
  return { options, outside: prompt.slice(0, markers[0]?.index ?? 0) }
}

/** "True or false: …" — the options are the lead words themselves. */
function trueFalseChoice(prompt: string): RecognizedChoice | null {
  const lead = /^\s*true\s+or\s+false\b[\s:?.,—–-]*/i.exec(prompt)
  return lead ? { options: ['true', 'false'], outside: prompt.slice(lead[0].length) } : null
}

interface EitherOrPattern {
  /** Captures the sentence text before the options, then the two options. */
  readonly pattern: RegExp
  readonly questionOnly?: boolean
}

const EITHER_OR_PATTERNS: readonly EitherOrPattern[] = [
  // "Is this adapting to or modifying the environment?"
  { pattern: /^((?:is|are|was|were|does|do|did)\s+(?:this|that|it|these|those)\s+)(.+)\s+or\s+(.+)$/i },
  // "Is a tomato a fruit or a vegetable?" — both options start with an article.
  { pattern: /^((?:is|are|was|were)\s+.+?\s+)((?:a|an|the)\s+.+?)\s+or\s+((?:a|an|the)\s+.+)$/i },
  // "Which planet is larger, Earth or Mars?"
  { pattern: /^(.*,\s*)([^,]+)\s+or\s+([^,]+)$/i, questionOnly: true },
]

/**
 * Exactly one sentence must end in the either/or pair. Everything except
 * that pair, including the other sentences, counts as outside the options.
 */
function eitherOrChoice(prompt: string, { pattern, questionOnly }: EitherOrPattern): RecognizedChoice | null {
  const sentences = prompt
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
  const found = sentences.flatMap((sentence, index): RecognizedChoice[] => {
    if (questionOnly && !sentence.includes('?') && !/\b(?:which|choose|select)\b/i.test(sentence)) return []
    const match = sentence.replace(/[?\s]+$/g, '').trim().match(pattern)
    if (!match) return []
    const left = match[2]?.trim() ?? ''
    const right = match[3]?.trim() ?? ''
    if (!isChoicePair(left, right)) return []
    const others = sentences.filter((_, other) => other !== index)
    return [{ options: [left, right], outside: [...others, match[1] ?? ''].join(' ') }]
  })
  return found.length === 1 ? (found[0] ?? null) : null
}

function recognizeChoice(prompt: string): RecognizedChoice | null {
  const structured = trueFalseChoice(prompt) ?? letteredChoice(prompt) ?? colonChoice(prompt)
  if (structured) return structured
  for (const pattern of EITHER_OR_PATTERNS) {
    const choice = eitherOrChoice(prompt, pattern)
    if (choice) return choice
  }
  return null
}

function answerRevealedOutside(answer: string, outside: string): boolean {
  const normalizedOutside = normalizeLeakageText(outside)
  const normalizedAnswer = normalizeLeakageText(answer)
  if (containsWordSequence(normalizedOutside, normalizedAnswer)) return true
  return normalizedAnswer
    .split(' ')
    .filter((token) => token.length >= LEAKAGE_MIN_ANSWER_LENGTH)
    .some((token) => containsWordSequence(normalizedOutside, token))
}

/**
 * Suppress only when the answer is one option in a recognized choice
 * construction and is not also disclosed outside that construction.
 * Anything less recognizable keeps the conservative notice.
 */
function isIntentionalUnrevealedChoice(prompt: string, answer: string): boolean {
  const normalizedPrompt = normalizeLeakageText(prompt)
  const normalizedAnswer = normalizeLeakageText(answer)
  if (disclosesAnswer(normalizedPrompt, normalizedAnswer)) return false
  const choice = recognizeChoice(prompt)
  if (!choice) return false
  const matched = choice.options.filter((option) => optionMatchesAnswer(option, answer))
  if (matched.length !== 1) return false
  return !answerRevealedOutside(answer, choice.outside)
}

function answerAppearsAsWholePhrase(prompt: string, answer: string): boolean {
  const trimmed = answer.trim()
  if (trimmed.length < LEAKAGE_MIN_ANSWER_LENGTH) return false
  const normalizedAnswer = normalizeLeakageText(trimmed)
  if (normalizedAnswer.length === 0) return false
  return containsWordSequence(normalizeLeakageText(prompt), normalizedAnswer)
}

function tileSubject(clue: DraftClue): QualityFindingSubject {
  return {
    kind: 'tile',
    categoryTitle: clue.categoryTitle,
    clueOrder: clue.clueOrder,
    tileCanonicalId: clue.tileCanonicalId,
    prompt: clue.prompt,
    answer: clue.answer,
    ...(clue.valueAuthored === false ? {} : { pointValue: clue.value }),
  }
}

function finalSubject(finalRound: NonNullable<AuthoringDraft['final']>): QualityFindingSubject {
  return {
    kind: 'final',
    roundTitle: finalRound.roundTitle,
    prompt: finalRound.prompt,
    answer: finalRound.answer,
  }
}

function answerLeakageFinding(
  prompt: string,
  answer: string,
  path: string | undefined,
  subject: QualityFindingSubject,
): QualityFinding | null {
  if (!answerAppearsAsWholePhrase(prompt, answer)) return null
  if (isIntentionalUnrevealedChoice(prompt, answer)) return null
  return heuristic('possible-answer-leakage', ANSWER_LEAKAGE_MESSAGE, path, subject)
}

export function formatQualityFindingLocation(subject: QualityFindingSubject): string {
  if (subject.kind === 'final') {
    const title = subject.roundTitle.trim()
    if (title.length === 0) return 'Final'
    return /\bfinal\b/i.test(title) ? title : `Final · ${title}`
  }
  const parts: string[] = []
  const category = subject.categoryTitle.trim()
  if (category.length > 0) parts.push(category)
  if (subject.pointValue !== undefined) parts.push(`${subject.pointValue} points`)
  parts.push(`Question ${subject.clueOrder}`)
  return parts.join(' | ')
}

export function qualityFindingConcern(code: string): string | undefined {
  if (code === 'possible-answer-leakage') return 'Possible answer giveaway'
  return undefined
}

function collectHeuristics(draft: AuthoringDraft): QualityFinding[] {
  const findings: QualityFinding[] = []
  const names = draft.game.teams.map((team) => team.name.trim()).filter((name) => name.length > 0)

  for (const team of draft.game.teams) {
    if (GENERIC_NAME.test(team.name.trim())) {
      findings.push(
        heuristic(
          'generic-team-name',
          `“${team.name}” looks like a generic placeholder name, not a class-specific identity.`,
          team.authoringKey,
        ),
      )
    }
  }

  const normalized = names.map((name) => ({ name, key: normalizeName(name) }))
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i]
      const b = normalized[j]
      if (a.key.length === 0 || b.key.length === 0) continue
      const near =
        a.key === b.key ||
        (a.key.length >= 4 && b.key.length >= 4 && (a.key.startsWith(b.key) || b.key.startsWith(a.key)))
      if (near) {
        findings.push(
          heuristic(
            'near-duplicate-team-name',
            `Team names “${a.name}” and “${b.name}” look the same or nearly the same.`,
            'teams',
          ),
        )
      }
    }
  }

  const bank = draft.game.teamNameBank ?? []
  if (bank.length > 0 && bank.length < 64) {
    findings.push(
      heuristic(
        'team-name-bank-short',
        `This game’s name bank has ${bank.length} names. The recommended deck is about 96 unique names. Fewer than 64 is a quality notice, not an import failure.`,
        'teamNameBank',
      ),
    )
  }

  const clues: DraftClue[] = draft.board.categories.flatMap((category) => category.clues)
  const promptKeys = new Map<string, DraftClue>()
  for (const clue of clues) {
    const key = normalizeName(clue.prompt)
    if (key.length >= 8) {
      const prior = promptKeys.get(key)
      if (prior) {
        findings.push(
          heuristic(
            'near-duplicate-prompt',
            `Two clues have the same prompt text after ignoring punctuation and spacing.`,
            clue.tileCanonicalId,
          ),
        )
      } else {
        promptKeys.set(key, clue)
      }
    }

    const leakage = answerLeakageFinding(clue.prompt, clue.answer, clue.tileCanonicalId, tileSubject(clue))
    if (leakage) findings.push(leakage)
  }

  if (draft.final) {
    const leakage = answerLeakageFinding(draft.final.prompt, draft.final.answer, 'final', finalSubject(draft.final))
    if (leakage) findings.push(leakage)
  }

  if (GENERIC_NAME.test(draft.game.title.trim())) {
    findings.push(
      heuristic('generic-game-title', `“${draft.game.title}” looks like a placeholder title.`, 'Title'),
    )
  }

  return findings
}

export function buildImportQualityReport(input: {
  readonly title?: string
  readonly gameId?: string
  readonly importResult?: ImportResult
  readonly draft?: AuthoringDraft
  readonly authoringIssues?: readonly AuthoringIssue[]
  readonly acceptance?: ImportAcceptance
}): ImportQualityReport {
  const findings: QualityFinding[] = []

  if (input.importResult?.status === 'failure') {
    findings.push(...input.importResult.issues.map(fromImportIssue))
  }

  if (input.authoringIssues && input.authoringIssues.length > 0) {
    findings.push(...input.authoringIssues.map(fromAuthoringIssue))
  }

  if (input.draft) {
    findings.push(...input.draft.issues.map(fromAuthoringIssue))
    findings.push(...collectHeuristics(input.draft))
  }

  const sorted = sortFindings(findings)
  const acceptance = input.acceptance ?? inferAcceptance(input, sorted)
  return {
    title: input.title ?? input.draft?.game.title ?? 'Imported game',
    gameId: input.gameId ?? input.draft?.game.gameCanonicalId,
    acceptance,
    importSucceeded: acceptance === 'accepted',
    findings: sorted,
    errorCount: sorted.filter((finding) => finding.classification === 'ERROR').length,
    warningCount: sorted.filter((finding) => finding.classification === 'WARNING').length,
    heuristicCount: sorted.filter((finding) => finding.classification === 'HEURISTIC').length,
  }
}

function inferAcceptance(
  input: {
    readonly importResult?: ImportResult
    readonly draft?: AuthoringDraft
    readonly authoringIssues?: readonly AuthoringIssue[]
  },
  findings: readonly QualityFinding[],
): ImportAcceptance {
  if (input.importResult?.status === 'success') return 'accepted'
  if (input.importResult?.status === 'failure') return 'rejected'
  if (input.authoringIssues && input.authoringIssues.length > 0 && !input.draft) return 'rejected'
  if (input.draft) {
    return findings.some((finding) => finding.classification === 'ERROR') ? 'unfinished' : 'accepted'
  }
  return 'rejected'
}
