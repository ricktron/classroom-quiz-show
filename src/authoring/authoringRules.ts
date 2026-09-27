import type { WorkbookProfile } from './contract'

export const AUTHORING_RULES_VERSION = 2 as const

export const CLASSIC_BOARD_DEFAULTS = {
  categoryCount: 6,
  cluesPerCategory: 5,
  values: [100, 200, 300, 400, 500] as const,
} as const

export interface DifficultyBand {
  readonly value: number
  readonly label: string
  readonly guidance: string
}

/**
 * Qualitative levers a model can vary to raise or lower cognitive demand.
 * These are guidance vocabulary for reasoning with, never a numeric rubric
 * to compute, weight, or report back (ADR-023 §2 / §7).
 */
export interface DifficultyDimension {
  readonly id: string
  readonly label: string
  readonly guidance: string
}

export interface AuthoringRuleSection {
  readonly id: string
  readonly title: string
  readonly rules: readonly string[]
}

export interface ExternalAuthoringRuleSet {
  readonly version: typeof AUTHORING_RULES_VERSION
  readonly profile: WorkbookProfile
  readonly profileLabel: string
  readonly defaultBoard: typeof CLASSIC_BOARD_DEFAULTS
  readonly difficultyBands: readonly DifficultyBand[]
  readonly difficultyDimensions: readonly DifficultyDimension[]
  readonly sections: readonly AuthoringRuleSection[]
}

const DIFFICULTY_BANDS: readonly DifficultyBand[] = [
  { value: 100, label: 'Foundational', guidance: 'Direct recognition or recall of an important taught idea. Clear wording and strong source support; never a trick. A genuinely accessible entry point for most students who engaged with the material.' },
  { value: 200, label: 'Developing', guidance: 'A distinction, relationship, or one-step application that goes beyond simple recall without depending on obscurity.' },
  { value: 300, label: 'Intermediate', guidance: 'Connect two ideas, interpret a short representation, or apply a concept in a familiar context.' },
  { value: 400, label: 'Advanced', guidance: 'Use multi-step reasoning, compare close alternatives, infer cause/effect, or apply learning in a less familiar context — still grounded in what was actually taught.' },
  { value: 500, label: 'Challenge', guidance: 'Synthesize or transfer important learning, resolve a meaningful misconception, or integrate multiple source elements. The board\u2019s highest ordinary demand, earned through thinking, never through trivia or obscurity.' },
]

const DIFFICULTY_DIMENSIONS: readonly DifficultyDimension[] = [
  { id: 'reasoning-steps', label: 'Reasoning steps', guidance: 'how many connected inferential steps the response requires, not how many facts must be memorized' },
  { id: 'integration', label: 'Integration', guidance: 'whether the student must combine multiple taught ideas rather than recall one isolated fact' },
  { id: 'transfer', label: 'Transfer', guidance: 'whether the student must apply a taught idea to a new example or context rather than repeat it verbatim' },
  { id: 'discrimination', label: 'Discrimination', guidance: 'whether the student must distinguish between closely related concepts, not merely recognize an isolated term' },
  { id: 'precision', label: 'Precision', guidance: 'how exact or complete the expected response must be, not how obscurely it is worded' },
]

/**
 * A single joined block avoids many short adjacent string-literal array
 * entries of matching length, which static-analysis duplication detectors
 * (token/structure based, not content based) can otherwise flag as
 * repeated shape across sibling sections. `ruleLines` keeps authoring the
 * text as ordinary one-rule-per-line prose.
 */
function ruleLines(text: string): readonly string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

const ASSIGNMENT_SECTION: AuthoringRuleSection = {
  id: 'assignment',
  title: 'Assignment and authority',
  rules: ruleLines(`
    Treat the workbook, the teacher request, and any uploaded class materials as one authoring packet.
    Follow explicit teacher instructions over defaults in this workbook when they do not conflict with the workbook schema.
    When class materials are supplied, treat them as the default factual/content boundary. Do not quietly add untaught facts just to fill the board.
    When no source materials are supplied, use the teacher-specified topic and ordinary reliable subject knowledge, avoiding uncertain or needlessly obscure facts.
    Never change CQS_META, sheet names, or headers. Return the completed .xlsx artifact, not a prose reconstruction of it.
  `),
}

const GROUNDING_SECTION: AuthoringRuleSection = {
  id: 'grounding',
  title: 'Source grounding and insufficiency',
  rules: ruleLines(`
    Prefer concepts explicitly taught, emphasized, defined, diagrammed, practiced, compared, or assessed in the supplied materials.
    Represent the supplied material broadly instead of over-sampling the easiest slides or the first section.
    Do not invent a fact, quotation, statistic, source citation, standard, or teacher emphasis that is not supported.
    If the available evidence cannot support a good clue for a required slot, leave Prompt and Answer blank and put a concise INSUFFICIENT SOURCE EVIDENCE note in Notes. CQS should block the unfinished game rather than accept fabricated content.
    When useful and space permits, put a concise source locator in Notes (for example slide, page, section, or timestamp).
    Do not expose hidden reasoning or chain-of-thought when explaining a source locator.
  `),
}

const CONTENT_SELECTION_SECTION: AuthoringRuleSection = {
  id: 'content-selection',
  title: 'Content selection',
  rules: ruleLines(`
    Prioritize durable learning targets, central concepts, relationships, processes, evidence, and common misconceptions over decorative trivia.
    Avoid duplicate questions that test the same fact in nearly the same way, even when the wording differs.
    Spread coverage across the requested scope.
    A coherent category should have a recognizable idea tying its clues together; do not make one merely by grouping five unrelated leftovers.
  `),
}

const CLUE_WRITING_SECTION: AuthoringRuleSection = {
  id: 'clue-writing',
  title: 'Clue and answer writing',
  rules: ruleLines(`
    Write one clear task per clue. Avoid double-barreled prompts unless the teacher explicitly asks for multi-part responses.
    Use enough context to identify the intended concept but do not place the canonical answer or an obvious form of it inside the prompt.
    Prefer natural classroom language over game-show imitation, legalistic phrasing, or unnecessary cleverness.
    Do not require students to phrase responses as questions unless the teacher explicitly requests that convention; CQS grades the authored answer content.
    Canonical Answer should be the shortest accurate response a teacher could reasonably grade from at a glance.
    Use Alternate fields for genuinely acceptable phrasings, abbreviations, or equivalent terms, not for unrelated guesses.
    Use Notes for host-only grading guidance, misconception boundaries, source locators, or what must be present in a correct response.
  `),
}

const QUALITY_SECTION: AuthoringRuleSection = {
  id: 'quality',
  title: 'Quality control',
  rules: ruleLines(`
    Check every clue for factual support, uniqueness, answer leakage, ambiguity, and alignment between difficulty/value and reasoning demand.
    Check that category titles are short enough for a projected board and that prompts do not require scrolling or hidden context.
    Check that alternates do not contradict the canonical answer and that Notes do not contain instructions meant for students.
    Do not use difficulty as a synonym for obscurity; higher-value clues should usually demand more reasoning, integration, transfer, or precision.
    Before returning the workbook, verify that every required semantic cell is complete or intentionally left incomplete with an insufficiency note.
    Keep questions classroom-appropriate, concise enough to project, and answerable from the intended learning rather than from wording tricks.
  `),
}

const SHARED_SECTIONS: readonly AuthoringRuleSection[] = [
  ASSIGNMENT_SECTION,
  GROUNDING_SECTION,
  CONTENT_SELECTION_SECTION,
  CLUE_WRITING_SECTION,
  QUALITY_SECTION,
]

const BOARD_SECTION: AuthoringRuleSection = {
  id: 'classic-board',
  title: 'Classic Board construction',
  rules: [
    'Unless the teacher requests another legal board shape, build 6 categories with 5 clues each.',
    'Use the normal 100, 200, 300, 400, 500 ladder once per category unless the teacher explicitly requests another legal scoring pattern.',
    'Within each category, make the sequence generally rise in cognitive demand or conceptual complexity from 100 to 500.',
    'Repeat the category title exactly on every clue row that shares the same CategoryOrder.',
    ...DIFFICULTY_BANDS.map((band) => `${band.value} (${band.label}): ${band.guidance}`),
    'Balance the whole board. Do not make all 100-point clues vocabulary and all 500-point clues obscure names or numbers.',
    'A teacher should be able to look at the category title and understand the conceptual family without the title giving away individual answers.',
  ],
}

/**
 * Difficulty is a generation contract, not a scoring engine: this section
 * asks the model to calibrate cognitive demand within each category and
 * across the whole board, using the qualitative levers in
 * `DIFFICULTY_DIMENSIONS`, and to repair mismatches before returning the
 * workbook. It never asks for a computed or reported numeric score.
 *
 * Kept deliberately row-efficient: the generated INSTRUCTIONS sheet shares
 * `MAX_WORKBOOK_ROWS` (limits.ts) with every other section across both
 * profiles, so this section packs the dimension vocabulary into one line
 * rather than one row per dimension.
 */
const dimensionLine = DIFFICULTY_DIMENSIONS.map(
  (dimension) => `${dimension.label} (${dimension.guidance})`,
).join('; ')

const CALIBRATION_SECTION: AuthoringRuleSection = {
  id: 'difficulty-calibration',
  title: 'Difficulty calibration (within-category and board-wide)',
  rules: ruleLines(`
    Calibrate difficulty on two axes at once: rising demand from 100 to 500 within each category, and comparable demand across every category at the same point value; a 300 clue in one category should feel like roughly the same reasoning demand as a 300 clue in any other category on this board.
    Vary demand using these qualitative levers, never a numeric rubric to compute or report: ${dimensionLine}.
    Difficulty is not obscurity, length, a trick/trap, or topical importance: a rare fact, a longer or more decorative prompt, misleading phrasing, or a frequently emphasized idea does not by itself justify a higher point value. Base difficulty on the thinking actually required.
    Calibrate relative to what the supplied class materials actually taught and emphasized, not to generic textbook, standardized-test, or trivia-night norms, and never to any individual student's inferred ability, grade history, or reading level.
    Even 400- and 500-point clues must stay inside the taught scope. When evidence cannot support the required demand, leave that slot's Prompt and Answer blank with an INSUFFICIENT SOURCE EVIDENCE note in Notes rather than manufacturing obscurity to fill it.
    Keep 100 a genuinely accessible entry point and 500 the board's highest ordinary demand, earned through synthesis, transfer, integration, or resolving a real misconception, never through obscurity or trivia.
    Before returning the workbook, run one final board-wide calibration pass: mentally cover the point-value column and check whether the demand you actually wrote would re-sort the clues back into the same 100-500 order, both within each category and across the whole board. Repair any mismatch without narrating the repair or including chain-of-thought about how you calibrated difficulty.
  `),
}

const TEAM_NAMES_SECTION: AuthoringRuleSection = {
  id: 'team-names',
  title: 'Optional team-name bank',
  rules: [
    'Generate names only after reading the actual game content so names can be grounded in the subject without revealing answers.',
    'Names must be school-appropriate, unique, easy to say, easy to project, and memorable.',
    'Avoid generic filler such as Team 1 or Red unless the teacher explicitly requests plain names.',
    'Recommended target: about 96 unique names. Fewer than 64 is a CQS quality notice, not an import blocker.',
  ],
}

const FINAL_SECTION: AuthoringRuleSection = {
  id: 'final',
  title: 'Final Wager construction',
  rules: [
    'Create one culminating Final prompt that is important to the requested scope and meaningfully more integrative than an ordinary low-value clue.',
    'Final should reward synthesis, transfer, interpretation, or connection across ideas rather than hinge on a niche fact.',
    'The canonical answer and acceptable alternates must be gradable quickly. Put strictness guidance in Notes when the response needs a specific idea.',
    'Do not create Final by simply copying or lightly rewording a board clue.',
    'Final should feel appropriately weighty for a culminating wager relative to the board you just calibrated: at least as demanding as the board\u2019s 400-500 range, never a step down.',
  ],
}

export function getExternalAuthoringRuleSet(profile: WorkbookProfile): ExternalAuthoringRuleSet {
  return {
    version: AUTHORING_RULES_VERSION,
    profile,
    profileLabel: profile === 'classic-board' ? 'Classic Board' : 'Board + Final',
    defaultBoard: CLASSIC_BOARD_DEFAULTS,
    difficultyBands: DIFFICULTY_BANDS,
    difficultyDimensions: DIFFICULTY_DIMENSIONS,
    sections: profile === 'board-plus-final'
      ? [...SHARED_SECTIONS, BOARD_SECTION, CALIBRATION_SECTION, FINAL_SECTION, TEAM_NAMES_SECTION]
      : [...SHARED_SECTIONS, BOARD_SECTION, CALIBRATION_SECTION, TEAM_NAMES_SECTION],
  }
}
