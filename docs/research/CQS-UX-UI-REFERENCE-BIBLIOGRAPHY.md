# CQS UX/UI reference bibliography

- **Document id:** `CQS-UX-UI-REFERENCE-BIBLIOGRAPHY`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-UX-GUIDANCE-S01-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-UX-GUIDANCE-S01-FOUNDATION-1`
- **Date / access date for all metadata checks:** 2026-09-11
- **Status:** Research evidence record — **descriptive metadata and labeled
  recommendations only. Authorizes no implementation and carries no CQS
  product authority.**

This is the durable CQS UX/UI reference shelf. It records what each source
**is**, how strongly its bibliographic metadata was actually verified, and
— separately — how much of its **content** has actually been ingested by this
project.

Books are research evidence. They are not CQS product authority. Where an
outside recommendation conflicts with a CQS invariant, CQS wins. See
[`../design/README.md`](../design/README.md) §3.

---

## 1. The two evidence axes

Conflating "I know this book exists" with "I have read this book" is the
failure mode this section exists to prevent. Every entry carries both.

### Content evidence state

| State | Meaning |
| --- | --- |
| `FULL-TEXT-INGESTED` | A lawful full copy was actually analyzed. Page/chapter references may be cited. |
| `PARTIAL/PREVIEW-INGESTED` | Only a preview, excerpt, or verified table of contents was available. Structural statements only. |
| `SECONDARY-SOURCE-ONLY` | Only third-party summaries were available. Must be labeled; must not be promoted to the author's position. |
| `OWNER-SUPPLIED-RECOMMENDATION` | The owner named it as a reference shelf item. Says nothing about content. |
| `NOT-YET-INGESTED` | No substantive content from this source has been read by this project. |

### Metadata verification state

| State | Meaning |
| --- | --- |
| `PUBLISHER-METADATA-VERIFIED` | Author, title, edition, year, publisher and ISBN were checked against publisher or publisher-grade listings. |
| `METADATA-PARTIAL` | Some fields verified; at least one field is uncertain and is flagged in the entry. |
| `METADATA-UNVERIFIED` | Not checked. |

**Current shelf state, stated plainly:**

```text
CONTENT: every source below is OWNER-SUPPLIED-RECOMMENDATION
         and NOT-YET-INGESTED.
         No book text was read in this slice.

METADATA: verified as recorded per entry.
```

Nothing in the CQS doctrine may be attributed to a specific chapter,
argument, or page of any source on this shelf until that source's content
state changes.

---

## 2. Global verification caveat

Metadata checks were performed on 2026-09-11 through this environment's egress
proxy. Several publisher domains were **blocked outright** — `routledge.com`,
`papress.com`, and `vitalsource.com` all returned egress-blocked errors — so
no publisher page was successfully fetched in full during this slice.

Consequently, every entry's metadata is **snippet-supported**: it rests on
search-result snippets, consistent across multiple independent listings
(publisher store pages, academic catalogs, and major retailers) where noted,
rather than on a fully retrieved publisher page. Where listings disagreed, the
disagreement is recorded rather than silently resolved.

Spot-check ISBNs and editions against a publisher before any
distribution-facing use.

---

## 3. Provenance rules

These rules bind any future work that cites this shelf.

### 3.1 When a full copy is available

If the owner supplies a lawful copy or text:

- analyze it;
- paraphrase principles in CQS's own words;
- preserve useful chapter/page references;
- **do not copy large copyrighted passages into this repository**;
- use short quotations only where a paraphrase genuinely loses the point;
- update that entry's content evidence state.

### 3.2 When only a preview or table of contents is available

It is legitimate to write:

> Chapter 4 covers UI text patterns.

It is **not** legitimate to write:

> Chapter 4 finds that teachers misread status text under time pressure.

unless that chapter's substantive content was actually available. Structural
statements about a book are not findings from it.

### 3.3 When only secondary sources are available

Label it `SECONDARY-SOURCE-ONLY` and name the secondary source. Do not
silently promote a summarizer's gloss into the original author's position.

### 3.4 When sources disagree

Do not average opinions. Record the disagreement, test both positions against
CQS's actual user, environment and invariants, and make a **CQS decision** —
recorded in the doctrine with its rationale.

### 3.5 Fabrication prohibitions

Never invent a chapter number, a page reference, a quotation, an ISBN, an
edition, or a finding. An unverified claim is labeled unverified or is not
written.

---

## 4. Foundation shelf

Highest expected influence on CQS doctrine.

### `CQS-UXB-01` — Don Norman, *The Design of Everyday Things*

Revised and Expanded Edition. Basic Books, 2013. ISBN 9780465050659.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Hachette/Basic Books listing,
  author's own JND.org listing, and NN/g listing agree; 368 pp.).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** affordances, signifiers, mapping, feedback, conceptual
  models, error recovery — the vocabulary behind `P06`, `P07`, `P08`, `P10`.
- **Priority:** very high. **Surfaces:** controller identity/assignment, Sony
  connection and recovery, Class Setup, errors/warnings/blockers.

### `CQS-UXB-02` — Alan Cooper, Robert Reimann, David Cronin, Christopher Noessel

*About Face: The Essentials of Interaction Design*, 4th edition. Wiley,
2014. ISBN 9781118766576.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Wiley product page listed;
  corroborated by Perlego, AbeBooks, VitalSource).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** goal-directed design, personas, excise, postures, and
  designing for intermediates rather than perpetual novices — behind `P01`,
  `P02`, `P18`.
- **Priority:** very high. **Surfaces:** Home, Class Setup, Host console,
  authoring.

### `CQS-UXB-03` — Jenifer Tidwell, Charles Brewer, Aynne Valencia

*Designing Interfaces: Patterns for Effective Interaction Design*, 3rd
edition. O'Reilly Media, 2020. ISBN 9781492051961.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (O'Reilly copyright page listed
  © 2020; Blackwell's, AbeBooks, VitalSource agree).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** a pattern vocabulary for lists, forms, boards, and
  progressive disclosure — behind `P09`, `P18`.
- **Priority:** high. **Surfaces:** game library, authoring, board surfaces.

### `CQS-UXB-04` — Jeff Johnson

*Designing with the Mind in Mind: Simple Guide to Understanding User
Interface Design Guidelines*, 3rd edition. Morgan Kaufmann, 2020. ISBN
9780128182024.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Elsevier/Morgan Kaufmann shop
  listing; VitalSource and ACM DL corroborate; published 2020-09).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** perceptual and cognitive limits — attention, working
  memory, visual search, reading — behind `P03`, `P05`, `P14`.
- **Priority:** high. **Surfaces:** Display, readiness summaries,
  classroom-pressure operation.

### `CQS-UXB-05` — Mica R. Endsley & Debra G. Jones

*Designing for Situation Awareness: An Approach to User-Centered Design*,
3rd edition. CRC Press, 2025. ISBN 9781032482118.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (CRC Press/Routledge listing and
  VitalSource agree; published 2025-03-24; eText ISBN 9781040272831). The
  Routledge domain itself was egress-blocked, so the publisher page was not
  fetched.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** the single closest analogue to a teacher operating a live
  classroom under interruption — perception, comprehension, projection, and
  SA-oriented display design. Behind `P04`, `P05`, `P08`.
- **Priority:** very high. **Surfaces:** Class Setup, readiness, Sony
  connection, Host console, errors/blockers.

### `CQS-UXB-06` — Celia Hodent

*The Gamer's Brain: How Neuroscience and UX Can Impact Video Game Design*,
2nd edition. CRC Press, 2026. ISBN 9781032058573.

- **Metadata:** `METADATA-PARTIAL`. The 2nd-edition ISBN 9781032058573 and
  eText 9781040707463 are consistently listed, with a release date reported as
  2026-03-06. The publisher page was **egress-blocked**, so the release date
  and imprint styling (CRC Press / Routledge) are snippet-only. The 1st
  edition (2017, ISBN 9781138034075; paperback reissue 9780367638184) is the
  widely available text.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** the student/audience side — attention, perception,
  motivation, game feel, and "game UX" as a discipline. Behind `P14`, `P15`,
  `P16`, `P23`.
- **Priority:** high. **Surfaces:** Display, buzz moment, transitions,
  scoreboard, team-name selection.

### `CQS-UXB-07` — Steve Krug

*Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability*,
3rd edition. New Riders, 2014. ISBN 9780321965516.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (New Riders/Peachpit listing;
  Open Library, library catalog and VitalSource agree; ~212 pp.).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** self-evidence, scannability, and cheap usability testing
  — behind `P02` and `P09`, and relevant to information density
  generally.
- **Priority:** medium-high. **Surfaces:** Home, onboarding, microcopy.

### `CQS-UXB-08` — Torrey Podmajersky

*Strategic Writing for UX: Drive Engagement, Conversion, and Retention with
Every Word*, 2nd edition. O'Reilly Media, 2025. ISBN 9781098174330.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (O'Reilly catalog entry for the
  2nd edition, platform id 9781098174323; retailer listings agree on 2025).
  1st edition: 2019, ISBN 9781492049395.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** UX content as a designed system — voice, patterns, and
  consistent terminology. Behind `P20`, and directly relevant to `F-UX-01`.
- **Priority:** high. **Surfaces:** microcopy, errors/warnings/blockers,
  import feedback, recovery instructions.

### `CQS-UXB-09` — Ellen Lupton

*Thinking with Type: A Critical Guide for Designers, Writers, Editors, and
Students*, 3rd edition, revised and expanded. Princeton Architectural Press,
2024. ISBN 9781797226828.

- **Metadata:** `METADATA-PARTIAL`. ISBN, edition, and a March 2024
  publication are consistently listed across retailers and the publisher's own
  store page appeared in results; `papress.com` was **egress-blocked**, so the
  page was not fetched. Princeton Architectural Press is distributed under
  Chronicle Books, and a Chronicle listing also appears — imprint attribution
  is therefore snippet-level. ~256 pp.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** typographic hierarchy, scale, line length, and legibility
  — behind `P14`.
- **Priority:** high for Display work. **Surfaces:** Display, scoreboard,
  clue presentation, projector readiness.

---

## 5. Core specialist shelf

### `CQS-UXB-10` — Luke Wroblewski

*Web Form Design: Filling in the Blanks*. Rosenfeld Media, 2008. ISBN
9781933820248.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Rosenfeld Media; author's own
  LukeW listing; ACM DL entry agrees).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** input efficiency, labels, validation timing, and error
  recovery in repeated data entry — behind `P18`.
- **Priority:** high for authoring. **Surfaces:** clue editor, authoring,
  team name entry.

### `CQS-UXB-11` — Indi Young

*Mental Models: Aligning Design Strategy with Human Behavior*. Rosenfeld
Media, 2008. ISBN 9781933820064.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Rosenfeld Media book page;
  retailer and Biblio listings agree, 2008-02).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** eliciting and honoring the user's model rather than the
  system's — behind `P06`, `P21`.
- **Priority:** medium-high. **Surfaces:** Game versus Session, controller
  identity, terminology.

### `CQS-UXB-12` — Dan Saffer

*Microinteractions: Designing with Details*. O'Reilly Media, 2013. ISBN
9781449342685 (Full Color Edition: 9781491945926).

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` with a recorded ambiguity: the
  original (2013-06, 9781449342685) and the Full Color Edition (2013-12,
  9781491945926) are distinct printings of the same text. Cite whichever copy
  is actually used.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** trigger → rule → feedback → loop, the anatomy of small
  interactions — behind `P16`, `P15`.
- **Priority:** medium-high. **Surfaces:** buzz moment, Buzzer Check,
  selection lock, save indicators.

### `CQS-UXB-13` — Val Head

*Designing Interface Animation: Improving the User Experience Through
Animation*. Rosenfeld Media, 2016. ISBN 9781933820323.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Rosenfeld Media book page;
  retailer listings agree).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** motion with a communicative job, and motion that must
  survive reduced-motion preferences — behind `P15`.
- **Priority:** high for S05. **Surfaces:** Display transitions, buzz
  choreography, round transitions, Final.

### `CQS-UXB-14` — Sarah Horton & Whitney Quesenbery

*A Web for Everyone: Designing Accessible User Experiences*. Rosenfeld
Media, 2014. ISBN 9781933820972.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED`, **with a correction**: the
  publication year is **2014**, not 2013 as the shelf request stated.
  Rosenfeld Media; eBook ISBN 9781933820392; foreword by Aaron Gustafson.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** accessibility as structural design with personas — behind
  `P17`, `P12`.
- **Priority:** high. **Surfaces:** accessibility (cross-cutting), keyboard
  fallback, Display contrast, non-color cues.

### `CQS-UXB-15` — Alla Kholmatova

*Design Systems: A Practical Guide for Creating Design Languages for Digital
Products*. Smashing Magazine, 2017. ISBN 9783945749586.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Smashing Magazine printed-books
  page; AbeBooks and retailer listings agree).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** design language as shared intent, and the risk of a
  system that outgrows its product — behind `P24`.
- **Priority:** medium, **bounded**. See `P24`: this source informs restraint
  as much as construction.
- **Surfaces:** global visual language.

### `CQS-UXB-16` — Jon Yablonski

*Laws of UX: Using Psychology to Design Better Products & Services*, 2nd
edition. O'Reilly Media, 2024. ISBN 9781098146962.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (O'Reilly catalog entry, platform
  id 9781098146955; author's own 2024 announcement; 1st edition 2020, ISBN
  9781492055310).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** a compact vocabulary for heuristics such as Fitts, Hick,
  Jakob, Miller, and the aesthetic-usability effect — useful as shared
  shorthand, **not** as evidence on its own.
- **Priority:** medium. **Surfaces:** cross-cutting; target sizing and choice
  count during live operation.

---

## 6. Backstop / specialist shelf

Consulted when a specific question needs depth the foundation shelf does not
cover.

### `CQS-UXB-17` — Yvonne Rogers, Helen Sharp, Jennifer Preece

*Interaction Design: Beyond Human-Computer Interaction*, 6th edition. Wiley,
2023. ISBN 9781119901099.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Wiley product page listed;
  Open Research Online and VitalSource agree; 2023-04; ~720 pp.).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** general HCI backstop; research methods and evaluation.
- **Priority:** low-medium, reference.

### `CQS-UXB-18` — Ben Shneiderman, Catherine Plaisant, Maxine Cohen, Steven Jacobs, Niklas Elmqvist, Nicholas Diakopoulos

*Designing the User Interface: Strategies for Effective Human-Computer
Interaction*, 6th edition. Pearson, 2016. ISBN 9780134380384.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` with a recorded ambiguity: the
  6th edition exists in a US edition and a **Global Edition** sharing ISBN
  listings in some catalogs (Pearson/InformIT and a Pearson+ eText id
  9780137503889 also appear). ~616 pp., 2016-04.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** the Eight Golden Rules, direct manipulation, and response
  time — backstop for `P16`, `P19`.
- **Priority:** low-medium, reference.

### `CQS-UXB-19` — Heydon Pickering

*Inclusive Design Patterns: Coding Accessibility Into Web Design*. Smashing
Magazine, 2016. ISBN 9783945749432.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Smashing Magazine listing;
  AbeBooks agrees).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** implementation-level accessible patterns — relevant to
  `P17` when a slice actually builds components.
- **Priority:** medium when S05 implements components.

### `CQS-UXB-20` — Jesse James Garrett

*The Elements of User Experience: User-Centered Design for the Web and
Beyond*, 2nd edition. New Riders, 2010. ISBN 9780321683687.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (New Riders/Peachpit listing;
  O'Reilly catalog entry 9780321688651 for the electronic edition).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** the strategy → scope → structure → skeleton → surface
  planes; a useful frame for why S05 is not "make it prettier".
- **Priority:** low-medium, framing.

### `CQS-UXB-21` — Michael J. Metts & Andy Welfle

*Writing Is Designing: Words and the User Experience*. Rosenfeld Media,
2020. ISBN 9781933820668.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Rosenfeld Media book page;
  retailer listings agree; foreword by Sara Wachter-Boettcher).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** error and edge-case content, and content as part of the
  design rather than a late pass — behind `P20`, `P08`.
- **Priority:** medium. **Surfaces:** errors/blockers, recovery instructions.

### `CQS-UXB-22` — Caroline Jarrett & Gerry Gaffney

*Forms that Work: Designing Web Forms for Usability*. Morgan Kaufmann, 2008.
ISBN 9781558607101.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Morgan Kaufmann; ACM DL entry
  agrees; 2008-11; foreword by Steve Krug).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** relationship, conversation and appearance in form design
  — complements `CQS-UXB-10` for `P18`.
- **Priority:** medium for authoring.

### `CQS-UXB-23` — Steve Swink

*Game Feel: A Game Designer's Guide to Virtual Sensation*. Morgan Kaufmann,
2008. ISBN 9780123743282.

- **Metadata:** `PUBLISHER-METADATA-VERIFIED` (Morgan Kaufmann Game Design
  series; ScienceDirect monograph entry agrees; 2008-11).
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** real-time control, responsiveness, and perceived
  immediacy — behind `P16`.
- **Priority:** medium-high for the buzz path and S05.

### `CQS-UXB-24` — Aarron Walter

*Designing for Emotion*, 2nd edition. A Book Apart, 2020.

- **Metadata:** `METADATA-PARTIAL`. Two ISBNs are listed for the 2nd edition in
  different catalogs — **9781952616495** and **9781937557935** — with
  publication dates of 2020-06-22 and 2020-06-23 respectively. A Book Apart is
  consistently named as publisher. Resolve the ISBN against the actual copy
  before citing.
- **Content:** `OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`.
- **CQS relevance:** personality after usability — behind `P23`.
- **Priority:** medium for S05.

### `CQS-UXB-25` — *(reserved)*

Additional owner-supplied sources are appended here using the same two-axis
labeling. Do not add an entry without recording both its metadata state and
its content state.

---

## 7. Initial research emphasis

This is a **routing recommendation**, not a set of conclusions. No chapter has
been ingested; nothing below may be cited as a finding.

### Teacher / operator side — Endsley & Jones, Norman, Cooper, Johnson

Questions to take to these sources first:

- What state must the teacher perceive, and at what moment?
- What does the teacher believe the system is doing?
- What is the next decision?
- Which exceptions matter enough to interrupt?
- How is recovery represented?
- How much mental work is being imposed?

### Student / audience side — Hodent, Lupton, Head, Swink

Questions to take to these sources first:

- What do students actually notice?
- Where is attention directed?
- Is a state change clear at distance?
- Does input feel immediate?
- Is typography readable at projection distance?
- Does the product feel alive without becoming noisy?

The pair is complementary by design: the Host problem is situation awareness
under interruption; the Display problem is shared attention and perceived
responsiveness. `P13` is the doctrine principle that keeps them separate.

---

## 8. Non-claims

This bibliography does **not**:

- claim any listed source was read;
- attribute any CQS principle to a specific chapter, page, or argument;
- grant any source authority over CQS product decisions;
- assert that any publisher page was successfully fetched — none was, for the
  reason recorded in §2;
- authorize implementation of anything.
