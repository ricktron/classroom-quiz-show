# Gameplay, Gamification, and Authoring Research Record

- **Document id:** `CQS-RESEARCH-EXPANDED-VISION`
- **Slice:** `CQS-PLAN-S01` (planning-only) · **Access date for all
  sources:** 2026-08-03
- **Status:** Research evidence record — descriptive evidence and labeled
  recommendations only; **authorizes no implementation**

This record supports the expanded-vision planning package. Findings carry
stable ids (`CQS-RF-…`) cited from the planning documents. Source-quality
precedence: official rules/documentation → primary scholarship →
systematic reviews/meta-analyses → maintained open-source repositories →
reputable secondary → community summaries (used only where nothing
stronger was reachable). This is **not** a systematic review.

## Global verification caveat

Research was performed 2026-08-03 through this environment's egress
proxy, which **blocked full-page fetches of most external domains**
(official rules pages, publisher sites, help centers, ERIC/PubMed).
Except where a finding says *fetched*, claims are supported by search
result snippets attributed to the named sources — consistent across
multiple independent snippets where noted, but **not verified against the
fully retrieved page**. Exact numbers flagged below should be
spot-checked against the linked source before any distribution-facing
use. GitHub repository pages and the Anthropic structured-output
documentation **were** fetched directly.

## A. Commercial quiz-show mechanics (descriptive evidence)

### CQS-RF-JEOPARDY-01 — Jeopardy! signaling and early-buzz lockout

- **Finding.** Contestants may not ring in until the clue is fully read
  and the signaling system is armed (lights invisible to viewers);
  buzzing early locks that contestant's device out for a quarter second
  (0.25 s).
- **Source.** Jeopardy.com J!Buzz, "How Does the Jeopardy! Buzzer Work?"
  (official; https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work);
  corroborated by University of Chicago Magazine
  (https://mag.uchicago.edu/node/2236, reputable secondary). Dates not
  visible. **Snippet-supported** (0.25 s figure attributed to both).
- **CQS interpretation.** Precedent for a readiness period ending in
  arming plus a short early-press lockout that punishes anticipation
  mildly without removing the team from play — the pattern behind
  `CQS-OD-013`/`CQS-OD-027`'s gentler ~500 ms classroom default.
- **Limitation.** Official wording not fetched; era changes to the
  lockout duration unverified. Descriptive evidence.

### CQS-RF-JEOPARDY-02 — Daily Double and Final Jeopardy wagering

- **Finding.** Daily Double: minimum wager $5; maximum is the greater of
  the contestant's score or the round's top clue value, so a nonpositive
  player can still wager up to that clue value ("true Daily Double" =
  entire score). Final Jeopardy: players ending Double Jeopardy at $0 or
  negative are excluded; eligible players wager $0 up to their full
  score (broadcast confirmations reported by entertainment press).
- **Source.** Playfactile rules explainer
  (https://www.playfactile.com/blog/how-to-play-jeopardy-complete-game-rules-explained/,
  secondary); Fox News / Collider episode reporting (secondary). Dates
  not visible. **Snippet-supported**; no official rulebook located.
- **CQS interpretation.** Direct precedent for `CQS-OD-005` (classic
  positive-score eligibility) and `CQS-OD-006` (nonpositive team's cap
  tied to the highest ordinary clue value).
- **Limitation.** Dollar caps are era-specific; unverified numerics.
  Descriptive evidence.

### CQS-RF-FEUD-01 — Family Feud survey-board mechanics

- **Finding.** Face-off between one member of each family; winner chooses
  play-or-pass; the controlling family names answers from a survey of
  100, scoring the number of respondents per answer; three strikes pass a
  single steal guess to the opponents; Fast Money runs two members
  through the same five questions in 20 s / 25 s with duplicate answers
  re-asked and 200 points winning the top prize.
- **Source.** LiveAbout "'Family Feud': The Rules of the Game"
  (https://www.liveabout.com/family-feud-brief-overview-1396911,
  reputable secondary); family-feud.com and UltraBoardGames (community).
  Dates not visible. **Snippet-supported**; duplicate-adjudication detail
  community-only; the "answers need ≥2 respondents" claim unconfirmed.
- **CQS interpretation.** The mechanic set behind Survey Showdown
  (`CQS-OD-083`…`CQS-OD-086`): face-off, play-or-pass, strikes, steal,
  survey-value scoring, and a later timed finale. CQS adapts the
  mechanics without branding/audio/styling imitation and adds mandatory
  provenance (`CQS-OD-085`) — broadcast play assumes real surveys;
  classroom play often will not have them.
- **Limitation.** No official Fremantle rules; era variations
  (multipliers, round counts) unverified. Descriptive evidence.

### CQS-RF-ESTIMATE-01 — Wits & Wagers estimate-and-bet mechanic

- **Finding.** All players write numeric estimates simultaneously;
  guesses are sorted on a betting mat and players bet on which is closest
  **without going over**, with payout odds rising toward the extremes and
  a highest-odds slot for "true answer below every guess."
- **Source.** OfficialGameRules.org / UltraBoardGames reproductions of
  the North Star Games rules (community; publisher rulebook PDF not
  reachable). **Snippet-supported.**
- **CQS interpretation.** Pattern for the parked Estimate and Wager
  format: simultaneous private numeric estimates then valuation — needs
  host-recorded entry absent student devices, which is why the format is
  parked with a host-entry UX dependency.
- **Limitation.** Exact odds ladder and edition differences unverified.
  Descriptive evidence.

### CQS-RF-CONNECT-01 — Only Connect connections/sequences/wall

- **Finding.** Connections: identify the link among up to four clues,
  scoring more with fewer clues revealed (5/3/2/1). Sequences: infer the
  fourth term from up to three. Connecting Wall: sort 16 clues into four
  groups with limited attempts near the end. Missing Vowels: rapid
  buzzer round on de-voweled phrases.
- **Source.** Wikipedia "Only Connect" and UKGameshows.com (community —
  strongest reachable; BBC pages blocked). **Snippet-supported.**
- **CQS interpretation.** Pattern for the parked Connections and
  Sequences and Grouping Wall formats: reveal-count-scaled scoring and
  grouping play both compose from clue-modifier + scoring-policy layers;
  no bespoke engine needed (`CQS-RA2-PRESET-01`).
- **Limitation.** Community-sourced; sequences scoring numerics
  unverified. Descriptive evidence.

### CQS-RF-CHAIN-01 — Weakest Link chain-and-bank

- **Finding.** Teams build a chain of consecutive correct answers up a
  money ladder; calling "bank" before one's question secures the chain
  value and resets the chain; a wrong answer loses unbanked value.
- **Source.** GameShows.com "How to Play — The Weakest Link"
  (https://www.gameshows.com/the-weakest-link/how-to-play, secondary);
  BuzzerBlog 2020 revival review (2020-09-30). **Snippet-supported.**
- **CQS interpretation.** Pattern for the parked Chain and Bank format:
  the bank action is a typed team command over a round-pot scoring
  policy. The show's elimination-vote element is deliberately excluded
  as classroom-inappropriate.
- **Limitation.** Version-specific values unverified. Descriptive
  evidence.

### CQS-RF-CHASE-01 — The Chase risk-offer ladder

- **Finding.** Before the head-to-head, the contestant picks among a
  higher offer (start closer to the pursuer), the earned middle offer, or
  a lower offer (extra step of safety); shared multiple-choice questions
  move both sides.
- **Source.** GameShows.com "How to Play — The Chase" and Sportskeeda
  ABC-version explainer (secondary). **Snippet-supported.**
- **CQS interpretation.** Pattern for the parked Risk Ladder format:
  choosing reward-vs-safety tiers is an ordinal pre-question choice over
  a scoring-policy — controller-compatible via the four ordinal buttons.
- **Limitation.** Board length and values vary by version. Descriptive
  evidence.

### CQS-RF-BUZZ-01 — Sony Buzz! controller and round formats

- **Finding.** Each Buzz! handset carries one large red buzzer plus four
  colored buttons; wired sets join four handsets to one USB connector
  (SCEH-0005 per retail listings); titles mix round formats such as
  Fastest Finger (speed-scaled points), Point Builder (flat points),
  Point Stealer, and Pie Fight (winner targets an opponent).
- **Source.** GameSpot reviews of Buzz!: The Mega Quiz and Buzz!: Quiz TV
  (reputable secondary); Pocket-lint review; retail hardware listings.
  **Snippet-supported.**
- **CQS interpretation.** The four-ordinal-button contract
  (`CQS-OD-025`) matches the physical hardware CQS already targets, and
  Buzz!'s own catalog demonstrates many formats sharing one controller
  vocabulary — supporting the policy-composition thesis. Point-stealing
  and elimination formats are noted but not adopted.
- **Limitation.** No Sony documentation; per-title point values vary.
  Descriptive evidence.

## B. Quiz bowl (organized competition rules)

### CQS-RF-QUIZBOWL-01 — NAQT tossup/bonus, powers, negs, bouncebacks

- **Finding.** NAQT tossups (10 pts) are interruptible by any player;
  answering correctly before the power mark scores 15 ("power");
  interrupting incorrectly costs 5 (the "neg"); the converting team
  receives a non-interruptible 3×10 bonus; standard NAQT play has no
  bouncebacks though configured variants exist. ACF plays untimed
  20-tossup games, traditionally without powers, bonuses 30 pts.
- **Source.** NAQT rules pages (https://www.naqt.com/rules/, official —
  blocked to fetch) and ACF gameplay rules
  (https://acf-quizbowl.com/rules/gameplay/, official — blocked);
  **snippet-supported**, consistent with the fetched open-source
  Protobowl implementation (below) which encodes 15/10/−5.
- **CQS interpretation.** The interruptible-tossup response policy and
  power/neg scoring policy for the parked Tossup and Bonus format; the
  neg is the strongest existing precedent for `CQS-OD-002`-style
  wrong-answer deduction being a *policy*, not a universal.
- **Limitation.** Current rules-year wording unverified. Descriptive
  evidence.

## C. Digital classroom platforms (product documentation)

### CQS-RF-KAHOOT-02 — Kahoot! scoring model

- **Finding.** Up to 1,000 points per question (toggleable 0 / 1,000 /
  2,000); speed scaling ≈ `(1 − (responseTime/questionTimer)/2) ×
  pointsPossible`, so the slowest correct answer still earns ~50%;
  streak bonuses add up to +500; no documented option keeps standard
  points while disabling speed scaling (open user requests ask for one).
- **Source.** Kahoot! Help "How points work"
  (https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work,
  official) and Kahoot's engineering blog on streaks (official-adjacent,
  ~2016). **Snippet-supported.**
- **CQS interpretation.** Kahoot's formula caps the speed component at
  half the value — a live-product precedent for `CQS-OD-009`'s "modest
  speed weighting" default. The missing disable-speed toggle is a gap
  CQS deliberately avoids by making scoring a policy.
- **Limitation.** Rounding details and current streak table unverified.
  Descriptive evidence.

### CQS-RF-QUIZIZZ-01 — Quizizz/Wayground timing and accommodation model

- **Finding.** Correct answers earn base 600 + 0–400 speed bonus; with
  the timer off, a flat 600 (accuracy-only). Timer modes allow answering
  after expiry or locking. Live vs. assigned self-paced modes; power-ups
  affect leaderboard score but not recorded accuracy; redemption
  questions re-serve misses. Official accommodations include read-aloud
  and extended timers.
- **Source.** Wayground Help Center articles (official;
  https://support.wayground.com/hc/en-us/articles/4408491293453-Grade-Questions-Using-Timer
  and related). **Snippet-supported.** (Quizizz rebranded Wayground,
  2025.)
- **CQS interpretation.** A shipping accuracy-only scoring mode and
  per-student time accommodations are precedent for CQS's
  speed-free scoring policies and preset-controlled timer styles; the
  leaderboard-vs-accuracy separation parallels CQS's
  presentation-vs-authority split.
- **Limitation.** Paid-tier boundaries unknown; rebrand makes older docs
  unstable. Descriptive evidence.

### CQS-RF-GIMKIT-01 — Gimkit economy and mode presets

- **Finding.** Students earn in-game cash for correct answers and spend
  it on upgrades/power-ups (compounding economy); the product ships many
  named modes with per-mode teacher options; KitCollab lets students
  submit questions for teacher approval before inclusion.
- **Source.** Gimkit Help Center (official;
  https://help.gimkit.com/en/category/game-modes-vi4qul/ and related);
  mode roster partly from the unofficial Gimkit Wiki.
  **Snippet-supported.**
- **CQS interpretation.** Evidence that a preset catalog over one
  question base is a proven teacher UX (`CQS-OD-001`,
  `CQS-RA2-PRESET-01`), and KitCollab is a live precedent for
  student-authored, teacher-approved content (`CQS-ARC-PARTICIPATION`
  routes; approval gate as in `CQS-OD-044`).
- **Limitation.** Mode roster churns; rename details wiki-sourced.
  Descriptive evidence.

### CQS-RF-JACKBOX-01 — Jackbox party formats

- **Finding.** Quiplash (written answers, head-to-head audience voting),
  Fibbage (bluffs mixed with the truth), The Poll Mine (teams guess the
  group's own poll ranking), Guesspionage (estimate survey percentages,
  others bet higher/lower), Split the Room (divisive hypotheticals) —
  all input via players' phones at jackbox.tv.
- **Source.** Jackbox Games official product pages
  (https://www.jackboxgames.com/games/…, official).
  **Snippet-supported**; point values from fan wikis.
- **CQS interpretation.** Mechanics feed the parked Bluff Lab and
  Majority Report formats — but Jackbox's phone-based input is exactly
  what CQS excludes, so CQS variants substitute controller-ordinal or
  host-assisted input; that substitution is why these stay parked behind
  `CQS-OPP-FUNNY-MODES` rather than being near-term ports.
- **Limitation.** Per-edition scoring differs. Descriptive evidence.

## D. Learning-science scholarship

### CQS-RF-QUIZZING-01 — Retrieval practice / testing effect

- **Finding.** Practice testing reliably outperforms restudy for delayed
  retention: foundational two-experiment demonstration (Roediger &
  Karpicke 2006, *Psychological Science* 17(3)); meta-analytically,
  272 effects across 118 articles yield moderate positive effects
  (reported g ≈ 0.50–0.61 overall; testing vs. restudy g ≈ +0.51)
  (Adesope, Trevisan & **Sundararajan** 2017, *Review of Educational
  Research* 87(3)); corroborated by Rowland 2014 (*Psychological
  Bulletin* 140(6), mean ≈ 0.50 SD).
- **Source type.** Primary study + two meta-analyses
  (https://journals.sagepub.com/doi/abs/10.1111/j.1467-9280.2006.01693.x;
  https://journals.sagepub.com/doi/abs/10.3102/0034654316689306;
  https://pubmed.ncbi.nlm.nih.gov/25150680/). **Snippet/abstract
  supported.**
- **CQS interpretation.** The core pedagogical justification for the
  whole product: frequent low-stakes retrieval helps retention. Format
  variety and question quality matter more than speed pressure — which
  supports authoring investment (`CQS-ARC-AUTHORING`) as the first arc.
- **Limitation.** Many lab studies; effects moderated by format and
  feedback; exact percentages not quotable. Descriptive evidence.

### CQS-RF-KAHOOT-01 — Kahoot! classroom research review

- **Finding.** A review of 93 studies (Wang & Tahir 2020, *Computers &
  Education* 149) reports positive effects on engagement, motivation,
  classroom dynamics, and often performance; documented challenges
  include technical problems, stressful time pressure, inability to
  change answers, fear of losing, and wear-off with repeated use;
  team play and longer timers are suggested mitigations.
- **Source type.** Systematic literature review (narrative; no pooled
  effect size)
  (https://www.sciencedirect.com/science/article/pii/S0360131520300208).
  **Snippet-supported.**
- **CQS interpretation.** Validates team-based play as the default
  (CQS is team-based by design), generous configurable timers
  (`CQS-OD-022`, `CQS-OD-030`), and modest rather than extreme speed
  weighting (`CQS-OD-009`).
- **Limitation.** Heterogeneous designs, self-report heavy. Descriptive
  evidence.

### CQS-RF-GAMIFICATION-01 — Gamification meta-analysis

- **Finding.** Sailer & Homner 2020 (*Educational Psychology Review*
  32(1)) report significant small-to-moderate effects of gamification on
  cognitive (g ≈ 0.49, k = 19), motivational (g ≈ 0.36, k = 16), and
  behavioral (g ≈ 0.25, k = 9) outcomes, with game fiction and
  competition-plus-collaboration as moderators and substantial
  heterogeneity cautions.
- **Source type.** Meta-analysis (https://eric.ed.gov/?id=EJ1245270).
  **Snippet-supported.**
- **CQS interpretation.** Supports narrative/identity elements
  (`CQS-ARC-IDENTITY` packs = game fiction) and combining competition
  with collaboration (team play; noncompetitive contribution routes).
- **Limitation.** Small k per outcome; pooled effects mask design
  variance. Descriptive evidence.

### CQS-RF-COMPETITION-01 — Competition: benefit and backfire

- **Finding.** Competition in digital game-based learning shows an
  overall positive learning effect (~0.39) across 25 articles (Chen,
  Shih & Law 2020, *ETR&D* 68). Counter-evidence: a 16-week longitudinal
  study found leaderboard+badge gamification reduced intrinsic
  motivation and final-exam performance over time (Hanus & Fox 2015,
  *Computers & Education* 80).
- **Source type.** Meta-analysis + primary longitudinal study
  (https://link.springer.com/article/10.1007/s11423-020-09794-1;
  doi 10.1016/j.compedu.2014.08.019). **Snippet-supported.**
- **CQS interpretation.** Competition helps on average and harms some —
  the direct evidence base behind `CQS-OD-056`'s mandatory
  noncompetitive credit routes, the rejection of raw-score leaderboards
  (`ROADMAP-AMENDMENT-001` §5.12), and presentation-only leaderboard
  moments (`CQS-OD-034`).
- **Limitation.** Hanus & Fox is two intact sections, non-randomized;
  competition not isolated from badges. Descriptive evidence.

### CQS-RF-CLICKERS-01 — Classroom response systems

- **Finding.** Reviews and meta-analysis of clicker-era response systems
  (Kay & LeSage 2009, *Computers & Education* 53(3); Hunsu, Adesope &
  Bayly 2016, *Computers & Education* 94 — 53 studies, ~26k
  participants) find consistent engagement/participation benefits, a
  small positive cognitive effect, and larger non-cognitive effects,
  moderated by how questions are used.
- **Source type.** Systematic review + meta-analysis
  (https://eric.ed.gov/?id=EJ848780;
  https://www.sciencedirect.com/science/article/abs/pii/S0360131515300853).
  **Snippet-supported**; exact pooled values not confirmed — described
  qualitatively.
- **CQS interpretation.** Physical response devices (CQS's controllers)
  carry decades of engagement evidence independent of phones; formative
  question use matters more than the hardware.
- **Limitation.** Mostly higher-ed; 2000s hardware era. Descriptive
  evidence.

### CQS-RF-ITEM-01 — Item-analysis fundamentals and sample size

- **Finding.** Classical item statistics: difficulty p-value (target
  band ≈ 0.30–0.70), discrimination via item-total correlation (rubrics
  like ≥0.35 good / ≤0.20 poor), distractors "non-functioning" under
  ~5% selection; item statistics are unstable at small N — guidance
  suggests ~100+ examinees for stable interpretation, far above a class
  of 20–30.
- **Source type.** University assessment-center references (Univ. of
  Washington ScorePak; Penn State item-analysis guide) + published
  article (PMC11040895, 2024). **Snippet-supported**; thresholds are
  conventions that vary by source.
- **CQS interpretation.** Grounds §15.2's rules: report discrimination
  "when sample size permits," keep analytic labels suggestive rather
  than psychometric, and never reduce quality to one score
  (`CQS-RF-ITEM-01` is cited by the analytics plan for exactly this).
- **Limitation.** Classical-test-theory rules of thumb assume
  norm-referenced use. Descriptive evidence.

### CQS-RF-PRIVACY-01 — Classroom recording privacy (planning level)

- **Finding.** Under U.S. Dept. of Education guidance, a classroom
  photo/video is a FERPA education record when directly related to a
  student and maintained by/for the school; incidental background
  capture generally is not. Audio recording is additionally governed by
  state consent law: federal law sets a one-party floor; roughly a
  dozen states require all-party consent (count varies by how hybrids
  are classified).
- **Source type.** Government guidance (studentprivacy.ed.gov FERPA
  photos/videos FAQ) + legal reference summaries (50-state charts).
  **Snippet-supported.** Not legal advice.
- **CQS interpretation.** Why native recording is `parked` behind
  privacy/permission/retention work (`CQS-OPP-NATIVE-RECORDING`) and
  why transcript workflows require school-policy review first
  (`CQS-OPP-TRANSCRIPT-IMPORT` trigger).
- **Limitation.** Fact-specific; state variance; school counsel governs.
  Descriptive evidence.

## E. Open-source implementations and authoring precedents

### CQS-RF-OSS-01 — Open-source Jeopardy-style and buzzer projects

- **Finding.** (All GitHub pages **fetched**.) howardchung/jeopardy
  (MIT; active 2026): web-server rooms, browser buzzers, buzz unlock
  delayed by clue syllable count, CSV custom games. theGrue/jeopardy
  (no license; 2015-era): LAN single-server host/contestant views,
  expects a physical buzzer system. wsun/multibuzzer (MIT):
  buzzer-only service on boardgame.io — clean separation of buzz
  arbitration from content. neotenic/protobowl (MIT; unmaintained):
  streams tossup words live and encodes 15/10/−5 power/neg scoring in
  the browser.
- **CQS interpretation.** Independent implementations converge on the
  patterns CQS chose (server/host authority, buzz arbitration separated
  from content, reading-delay before arming) and prove
  interruptible-tossup play is feasible in a browser. None is treated
  as an authoritative product standard.
- **Limitation.** Stars/activity are weak proxies; none is
  classroom-validated. Descriptive evidence.

### CQS-RF-OSS-02 — Physical buzzer hardware reuse

- **Finding.** (Fetched.) marvin-wtt/BuzzMaster (MIT; active 2026):
  Electron desktop app driving PlayStation Buzz! controllers over USB
  HID with buzzer/multiple-choice/stopwatch modes — no network.
  micolous/xbox360bb: Linux kernel driver exposing Xbox 360 Big Button
  pads as input devices. Arduino lockout-buzzer DIY builds are common.
- **CQS interpretation.** Corroborates CQS's local-host-attached
  controller thesis and shows the Buzz! HID reuse path is trodden;
  BuzzMaster's first-press-lockout default contrasts with CQS's full
  ordered queue — a deliberate CQS difference, not an oversight.
- **Limitation.** Small user bases; hardware claims lightly tested.
  Descriptive evidence.

### CQS-RF-IMPORT-01 — Spreadsheet-import precedents

- **Finding.** Kahoot (official template: one row per question, four
  answer columns, time limit, correct-answer numbers; help article
  115002812547, feature launched 2018), Blooket (CSV template with
  question/answers/correct columns), and Wayground (template-based
  spreadsheet upload inside its AI import flow) all officially support
  spreadsheet import with a downloadable template.
- **Source type.** Official help pages. **Snippet-supported.**
- **CQS interpretation.** Template-based spreadsheet authoring is an
  established teacher workflow (`CQS-OD-042`); existing products use
  flat single-tab quiz templates, so CQS's preset-specific multi-tab
  workbooks (§12.1) are a deliberate step beyond precedent, justified by
  its richer format catalog.
- **Limitation.** Current column details unverified. Descriptive
  evidence.

### CQS-RF-LLM-01 — Schema-constrained LLM generation

- **Finding.** Anthropic's structured-outputs documentation (**fetched**;
  https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
  documents constraining output to a supplied JSON Schema; OpenAI's
  structured-outputs guide (snippet-supported; introduced Aug 2024)
  documents the same pattern. Two independent vendors ⇒ the pattern is
  established and model-neutral.
- **CQS interpretation.** Supports §12's design claim that a
  model-neutral authoring packet returning a strictly validated artifact
  is feasible. **Labeled implementation recommendation:** design the
  authoring packet against a schema-constrained output mode where
  available, while validating everything in CQS regardless
  (`CQS-OD-044` makes CQS-side validation mandatory anyway).
- **Limitation.** Vendor schema subsets differ; parameter names shift.
  Mixed: descriptive evidence + one labeled recommendation.

## F. Future scholarly-search needs

- Speed-pressure effects on science-content retention specifically
  (current evidence is engagement-focused).
- Team-based retrieval practice vs. individual retrieval practice effect
  sizes.
- Humor in assessment items and its effect on recall/anxiety
  (supports the Funny Review profiles).
- Credit/grading structures for game participation (equity evidence for
  `CQS-ARC-PARTICIPATION`).
- Difficulty-calibration methods usable at classroom N (for
  `CQS-OD-045`'s calibration ambition).

## Source-count summary

| Category | Sources cited |
| --- | --- |
| Official rules / product / vendor documentation | 14 |
| Government guidance | 1 |
| Primary scholarship | 2 |
| Systematic reviews / meta-analyses | 6 |
| Maintained open-source repositories (fetched) | 6 |
| Reputable secondary | 10 |
| Community summaries (no stronger source reachable) | 6 |

No load-bearing design claim rests solely on a community wiki or
unsourced blog; where community sources are the best reachable (Wits &
Wagers, Only Connect), the dependent CQS formats are `parked` and their
specs must be re-verified before authorization.
