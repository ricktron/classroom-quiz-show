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

/**
 * Overall challenge and difficulty ramp have a small fixed vocabulary
 * (unlike audience/course-level, which stays free natural language per
 * brief §2 — "do not require a fixed enumerated grade list"). Typed here
 * so tests can assert on the data instead of embedded prose.
 */
export interface ChallengeLevel {
  readonly id: 'accessible' | 'standard' | 'challenging'
  readonly label: string
  readonly guidance: string
}

export interface RampLevel {
  readonly id: 'shallow' | 'standard' | 'steep'
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
  readonly overallChallengeLevels: readonly ChallengeLevel[]
  readonly difficultyRampLevels: readonly RampLevel[]
  readonly difficultyProfileDefaults: typeof DIFFICULTY_PROFILE_DEFAULTS
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
 * Difficulty Profile = audience baseline (free text, resolved in prose only)
 * x overall challenge x difficulty ramp. Challenge and ramp are independent
 * fixed-vocabulary settings the model resolves before authoring; see
 * `DIFFICULTY_PROFILE_SECTION` for the embedded intake/QA contract.
 */
export const OVERALL_CHALLENGE_LEVELS: readonly ChallengeLevel[] = [
  { id: 'accessible', label: 'Accessible', guidance: 'broad success for learners who engaged with the material; keep even 400/500 approachable from direct taught knowledge and modest reasoning' },
  { id: 'standard', label: 'Standard', guidance: 'normal classroom-review demand using the intended 100-500 progression \u2014 default when unresolved' },
  { id: 'challenging', label: 'Challenging', guidance: 'push the audience harder through more integration, transfer, discrimination, precision, and multi-step reasoning toward 400/500, never through untaught trivia or outside knowledge' },
]

export const DIFFICULTY_RAMP_LEVELS: readonly RampLevel[] = [
  { id: 'shallow', label: 'Shallow', guidance: 'gradual 100-500 increase with modest gaps between adjacent values \u2014 good for younger or less-confident audiences' },
  { id: 'standard', label: 'Standard', guidance: 'meaningful, obvious progression across 100-500 \u2014 default when unresolved' },
  { id: 'steep', label: 'Steep', guidance: '100/200 stay accessible; 300 meaningfully raises reasoning; 400/500 require noticeably deeper integration, transfer, discrimination, or inference \u2014 still inside taught scope, never via obscurity' },
]

export const DIFFICULTY_PROFILE_DEFAULTS = {
  overallChallenge: 'standard',
  ramp: 'standard',
} as const

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
    Prefer concepts explicitly taught, emphasized, defined, diagrammed, practiced, compared, or assessed in the supplied materials, and represent that material broadly instead of over-sampling the easiest slides or the first section.
    Do not invent a fact, quotation, statistic, source citation, standard, or teacher emphasis that is not supported. If the available evidence cannot support a good clue for a required slot, leave Prompt and Answer blank and put a concise INSUFFICIENT SOURCE EVIDENCE note in Notes instead — CQS should block the unfinished game rather than accept fabricated content.
    When useful and space permits, put a concise source locator in Notes (for example slide, page, section, or timestamp) without exposing hidden reasoning or chain-of-thought.
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
    Write one clear task per clue (avoid double-barreled prompts unless the teacher explicitly asks for multi-part responses), using enough context to identify the intended concept without placing the canonical answer or an obvious form of it inside the prompt.
    Prefer natural classroom language over game-show imitation, legalistic phrasing, or unnecessary cleverness, and do not require students to phrase responses as questions unless the teacher explicitly requests that convention — CQS grades the authored answer content.
    Canonical Answer should be the shortest accurate response a teacher could reasonably grade from at a glance.
    Use Alternate fields for genuinely acceptable phrasings, abbreviations, or equivalent terms (not unrelated guesses), and Notes for host-only grading guidance, misconception boundaries, source locators, or what must be present in a correct response.
  `),
}

const QUALITY_SECTION: AuthoringRuleSection = {
  id: 'quality',
  title: 'Quality control',
  rules: ruleLines(`
    Check every clue for factual support, uniqueness, answer leakage, ambiguity, and alignment between difficulty/value and reasoning demand, and that alternates do not contradict the canonical answer while Notes stay free of instructions meant for students.
    Check that category titles are short enough for a projected board, prompts do not require scrolling or hidden context, and questions stay classroom-appropriate, concise enough to project, and answerable from the intended learning rather than from wording tricks.
    Before returning the workbook, verify that every required semantic cell is complete or intentionally left incomplete with an insufficiency note.
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
 * Difficulty Profile intake: resolve audience/course-level baseline, overall
 * challenge, and difficulty ramp as one coherent setting before authoring
 * (brief §1-§7). Audience stays free natural language on purpose; challenge
 * and ramp are packed from `OVERALL_CHALLENGE_LEVELS` /
 * `DIFFICULTY_RAMP_LEVELS` into single lines for the same row-budget reason
 * as `dimensionLine` below.
 */
const overallChallengeLine = OVERALL_CHALLENGE_LEVELS.map(
  (level) => `${level.label} (${level.guidance})`,
).join('; ')

const difficultyRampLine = DIFFICULTY_RAMP_LEVELS.map(
  (level) => `${level.label} (${level.guidance})`,
).join('; ')

const DIFFICULTY_PROFILE_SECTION: AuthoringRuleSection = {
  id: 'difficulty-profile',
  title: 'Difficulty Profile intake (audience x overall challenge x ramp)',
  rules: ruleLines(`
    Before authoring, resolve the Difficulty Profile and hold it for the whole board: an audience/course-level baseline that is natural language, not a fixed list (for example first grade; middle-school science; 9th-grade Earth & Space Science; AP/advanced high school; introductory college; adult/professional learners) and resolved only from explicit teacher instruction, course context, or supplied materials, never from an individual student's personal characteristics, accommodations, or presumed ability; an overall challenge relative to that audience; and a 100-500 difficulty ramp steepness. These three are independent \u2014 challenge and ramp reshape the board's demand and spread, they never change the audience \u2014 and the whole profile stays inside the taught-scope boundary below, never authorizing outside facts.
    Overall challenge (relative to the audience): ${overallChallengeLine}.
    Difficulty ramp (100-500 steepness, independent of overall challenge): ${difficultyRampLine}.
    Minimize teacher friction: infer each setting from the request, course context, and supplied materials first, interpreting natural language freely ("hard game for college freshmen with a big jump between easy and hard questions" or "keep it pretty easy for my first graders, don't make the 500s dramatically harder" each fully resolve the profile without asking anything further); only when one or more settings remain genuinely ambiguous and the environment supports interaction, ask exactly one batched question covering just the unresolved settings, for example "Before I build the game: who are the intended learners/course level, should the overall game be accessible, standard, or challenging for them, and should the 100-500 progression be shallow, standard, or steep?" \u2014 never three separate questions, and never re-ask a setting already resolved.
    When interaction is unavailable, or the teacher says to use your judgment: infer audience only from explicit evidence and never invent a specific learner population without it, and default overall challenge and ramp to Standard. Never fail generation because this clarification could not happen.
  `),
}

/**
 * Difficulty is a generation contract, not a scoring engine: this section
 * asks the model to calibrate cognitive demand within each category and
 * across the whole board, using the qualitative levers in
 * `DIFFICULTY_DIMENSIONS`, under the Difficulty Profile resolved above, and
 * to repair mismatches before returning the workbook. It never asks for a
 * computed or reported numeric score.
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
    Calibrate difficulty on two axes at once under the resolved Difficulty Profile: rising demand from 100 to 500 within each category, and comparable demand across every category at the same point value; a 300 clue in one category should feel like roughly the same reasoning demand as a 300 clue in any other category on this board, regardless of how sophisticated that category's topic seems.
    Vary demand using these qualitative levers, never a numeric rubric to compute or report: ${dimensionLine}. Difficulty is not obscurity, length, a trick/trap, or topical importance: a rare fact, a longer or more decorative prompt, misleading phrasing, or a frequently emphasized idea does not by itself justify a higher point value; base difficulty on the thinking actually required, and keep 100 a genuinely accessible entry point and 500 the board's highest ordinary demand, earned through synthesis, transfer, integration, or resolving a real misconception.
    Calibrate relative to what the supplied class materials actually taught and emphasized, not to generic textbook, standardized-test, or trivia-night norms, and never to any individual student's inferred ability, grade history, or reading level. Even 400- and 500-point clues must stay inside the taught scope regardless of overall challenge or ramp; when evidence cannot support the required demand, leave that slot's Prompt and Answer blank with an INSUFFICIENT SOURCE EVIDENCE note in Notes rather than manufacturing obscurity to fill it.
    Before returning the workbook, run one final board-wide calibration pass covering both relative ordering and the requested profile: would the demand you actually wrote re-sort the clues back into the same 100-500 order, both within each category and across the whole board, and does the finished board actually feel like the resolved audience + overall challenge + ramp (no dramatic cliffs between adjacent values for shallow; a clearly harder 400/500 than 100/200 for steep; broadly approachable throughout for accessible; pushed but still taught and fair for challenging)? Repair any mismatch without narrating the repair or including chain-of-thought about how you calibrated difficulty.
  `),
}

const TEAM_NAMES_SECTION: AuthoringRuleSection = {
  id: 'team-names',
  title: 'Optional team-name bank',
  rules: [
    'Generate names only after reading the actual game content (so names are grounded in the subject without revealing answers), and make them school-appropriate, unique, easy to say, easy to project, and memorable.',
    'Avoid generic filler such as Team 1 or Red unless the teacher explicitly requests plain names. Recommended target is about 96 unique names; fewer than 64 is a CQS quality notice, not an import blocker.',
  ],
}

const FINAL_SECTION: AuthoringRuleSection = {
  id: 'final',
  title: 'Final Wager construction',
  rules: [
    'Create one culminating Final prompt that is important to the requested scope and meaningfully more integrative than an ordinary low-value clue, rewarding synthesis, transfer, interpretation, or connection across ideas rather than hinging on a niche fact.',
    'The canonical answer and acceptable alternates must be gradable quickly (put strictness guidance in Notes when the response needs a specific idea), and Final must not be created by simply copying or lightly rewording a board clue.',
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
    overallChallengeLevels: OVERALL_CHALLENGE_LEVELS,
    difficultyRampLevels: DIFFICULTY_RAMP_LEVELS,
    difficultyProfileDefaults: DIFFICULTY_PROFILE_DEFAULTS,
    sections: profile === 'board-plus-final'
      ? [...SHARED_SECTIONS, BOARD_SECTION, DIFFICULTY_PROFILE_SECTION, CALIBRATION_SECTION, FINAL_SECTION, TEAM_NAMES_SECTION]
      : [...SHARED_SECTIONS, BOARD_SECTION, DIFFICULTY_PROFILE_SECTION, CALIBRATION_SECTION, TEAM_NAMES_SECTION],
  }
}
