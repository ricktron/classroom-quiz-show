import type { WorkbookProfile } from './contract'

export const AUTHORING_RULES_VERSION = 1 as const

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
  readonly sections: readonly AuthoringRuleSection[]
}

const DIFFICULTY_BANDS: readonly DifficultyBand[] = [
  { value: 100, label: 'Foundational', guidance: 'Direct recognition or recall of an important taught idea. Clear wording and strong source support; never a trick.' },
  { value: 200, label: 'Developing', guidance: 'A distinction, relationship, or one-step application that goes beyond simple recall without depending on obscurity.' },
  { value: 300, label: 'Intermediate', guidance: 'Connect two ideas, interpret a short representation, or apply a concept in a familiar context.' },
  { value: 400, label: 'Advanced', guidance: 'Use multi-step reasoning, compare close alternatives, infer cause/effect, or apply learning in a less familiar context.' },
  { value: 500, label: 'Challenge', guidance: 'Synthesize or transfer important learning, resolve a meaningful misconception, or integrate multiple source elements. Difficulty must come from thinking, not trivia.' },
]

const SHARED_SECTIONS: readonly AuthoringRuleSection[] = [
  {
    id: 'assignment',
    title: 'Assignment and authority',
    rules: [
      'Treat the workbook, the teacher request, and any uploaded class materials as one authoring packet.',
      'Follow explicit teacher instructions over defaults in this workbook when they do not conflict with the workbook schema.',
      'When class materials are supplied, treat them as the default factual/content boundary. Do not quietly add untaught facts just to fill the board.',
      'When no source materials are supplied, use the teacher-specified topic and ordinary reliable subject knowledge, avoiding uncertain or needlessly obscure facts.',
      'Never change CQS_META, sheet names, or headers. Return the completed .xlsx artifact, not a prose reconstruction of it.',
    ],
  },
  {
    id: 'grounding',
    title: 'Source grounding and insufficiency',
    rules: [
      'Prefer concepts explicitly taught, emphasized, defined, diagrammed, practiced, compared, or assessed in the supplied materials.',
      'Represent the supplied material broadly instead of over-sampling the easiest slides or the first section.',
      'Do not invent a fact, quotation, statistic, source citation, standard, or teacher emphasis that is not supported.',
      'If the available evidence cannot support a good clue for a required slot, leave Prompt and Answer blank and put a concise INSUFFICIENT SOURCE EVIDENCE note in Notes. CQS should block the unfinished game rather than accept fabricated content.',
      'When useful and space permits, put a concise source locator in Notes (for example slide, page, section, or timestamp). Do not expose hidden reasoning.',
    ],
  },
  {
    id: 'content-selection',
    title: 'Content selection',
    rules: [
      'Prioritize durable learning targets, central concepts, relationships, processes, evidence, and common misconceptions over decorative trivia.',
      'Avoid duplicate questions that test the same fact in nearly the same way, even when the wording differs.',
      'Spread coverage across the requested scope. A coherent category should have a recognizable idea tying its clues together.',
      'Do not make a category merely by grouping five unrelated leftovers.',
      'Keep questions classroom-appropriate, concise enough to project, and answerable from the intended learning rather than from wording tricks.',
    ],
  },
  {
    id: 'clue-writing',
    title: 'Clue and answer writing',
    rules: [
      'Write one clear task per clue. Avoid double-barreled prompts unless the teacher explicitly asks for multi-part responses.',
      'Use enough context to identify the intended concept but do not place the canonical answer or an obvious form of it inside the prompt.',
      'Prefer natural classroom language over game-show imitation, legalistic phrasing, or unnecessary cleverness.',
      'Canonical Answer should be the shortest accurate response a teacher could reasonably grade from at a glance.',
      'Use Alternate fields for genuinely acceptable phrasings, abbreviations, or equivalent terms, not for unrelated guesses.',
      'Use Notes for host-only grading guidance, misconception boundaries, source locators, or what must be present in a correct response.',
    ],
  },
  {
    id: 'quality',
    title: 'Quality control',
    rules: [
      'Check every clue for factual support, uniqueness, answer leakage, ambiguity, and alignment between difficulty/value and reasoning demand.',
      'Check that category titles are short enough for a projected board and that prompts do not require scrolling or hidden context.',
      'Check that alternates do not contradict the canonical answer and that Notes do not contain instructions meant for students.',
      'Do not use difficulty as a synonym for obscurity. Higher-value clues should usually demand more reasoning, integration, transfer, or precision.',
      'Before returning the workbook, verify that every required semantic cell is complete or intentionally left incomplete with an insufficiency note.',
    ],
  },
]

const BOARD_SECTION: AuthoringRuleSection = {
  id: 'classic-board',
  title: 'Classic Board construction',
  rules: [
    'Unless the teacher requests another legal board shape, build 6 categories with 5 clues each.',
    'Use the normal 100, 200, 300, 400, 500 ladder once per category unless the teacher explicitly requests another legal scoring pattern.',
    'Within each category, make the sequence generally rise in cognitive demand or conceptual complexity from 100 to 500.',
    ...DIFFICULTY_BANDS.map((band) => `${band.value} (${band.label}): ${band.guidance}`),
    'Balance the whole board. Do not make all 100-point clues vocabulary and all 500-point clues obscure names or numbers.',
    'A teacher should be able to look at the category title and understand the conceptual family without the title giving away individual answers.',
  ],
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
  ],
}

export function getExternalAuthoringRuleSet(profile: WorkbookProfile): ExternalAuthoringRuleSet {
  return {
    version: AUTHORING_RULES_VERSION,
    profile,
    profileLabel: profile === 'classic-board' ? 'Classic Board' : 'Board + Final',
    defaultBoard: CLASSIC_BOARD_DEFAULTS,
    difficultyBands: DIFFICULTY_BANDS,
    sections: profile === 'board-plus-final'
      ? [...SHARED_SECTIONS, BOARD_SECTION, FINAL_SECTION, TEAM_NAMES_SECTION]
      : [...SHARED_SECTIONS, BOARD_SECTION, TEAM_NAMES_SECTION],
  }
}
