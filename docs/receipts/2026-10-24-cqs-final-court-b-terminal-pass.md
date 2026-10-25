# Receipt — Final Court B terminal PASS (`CBF-D1D9828F`)

**Date:** 2026-10-24 (America/Chicago; run timestamps in Z)
**Run id:** `CBF-D1D9828F`
**Bound candidate / baseline SHA:** `a1af00f9c5bb6c5e56d13a7a1130f9f005166ba5` (`origin/main` at run)
**Kind:** durable Court B BLACK-BOX TEACHER RUN evidence transfer (docs only)
**Status:** **COURT B: PASS**. Not a product change. Not a merge. Not an independent-review certificate. Not a physical Sony / Windows / projector / signed-release claim.

Frozen original package (operator machine):
`/private/tmp/claude-501/-Users-macdaddy-Documents-Coding-Cursor-Projects-classroom-quiz-show--claude-worktrees-upbeat-cray-ec94ee/e59c0b6d-be92-46f2-97e7-6edc5794ab91/scratchpad/campaign/courtb-FINAL-a1af00f9`

Verified deposit (read-only copy) under the CQS2 project store:
`internal/court-b-reconcile/artifacts/courtb-FINAL-a1af00f9/`

Companion ledger in-repo:
[`../qualification/COURTB-RUN-MANIFEST.md`](../qualification/COURTB-RUN-MANIFEST.md)

## 1. Sealed identities (exact full hashes)

| Field | Value |
| --- | --- |
| Run id (`run-id.txt`) | `CBF-D1D9828F` |
| Bound baseline SHA | `a1af00f9c5bb6c5e56d13a7a1130f9f005166ba5` |
| Mapping sealed at | `2026-10-24T05:21:46+00:00` |
| Mapping sha256 (`mapping.json` / `mapping.sha256`) | `12b99d1966384b2eaa863674d2a2ad0d7189996a115afe9dd0986d6ca601fc95` |
| Pre-unseal attribution sha256 (`operator/pre-unseal-attribution.txt`) | `6aac3425ea176773640a9df0f0f5f9f04cedf38ac43c09c4421d61fb18db4012` |
| Addendum 1 sha256 (`mapping-addendum-1.json`) | `5a9eba5c02c99140502b7f63088ecdec974f45a06e078e092d07f87eb297cb38` |
| Declared population | **14** = 1 CLEAN + 13 seeded |
| Ledger rows | **16** (14 declared + 2 INVALID re-declarations under fresh codes) |
| DECLARED COMPLETE | **14 / 14** |
| INVALID (re-declared) | **2** (`CB3-3EA05CEE`, `CB3-EF73E1C2`) |
| Re-declaration codes | `CB3-F3218376`, `CB3-48A0396A` |

Integrity check performed before transfer: `shasum -a 256 mapping.json` equals `mapping.sha256`; `shasum -a 256 operator/pre-unseal-attribution.txt` equals the LEDGER pre-unseal field; `shasum -a 256 mapping-addendum-1.json` equals the LEDGER addendum field. Original mapping file was never modified after seal.

Note: `operator/evidence-hashes.txt` retains an **earlier** (mid-run) hash line for `pre-unseal-attribution.txt` (`fbc2dda0…`) from before the final freeze. The **authoritative sealed** pre-unseal hash is the LEDGER / final file value `6aac3425…` above.

Mapping **contents** are not reproduced here (operator-only). Post-unseal seed identities appear only in the completed ledger / detection table below.

## 2. Protocol order (frozen)

1. All 14 declared builds reached a terminal row (COMPLETE or INVALID).
2. Blind attributions frozen into `operator/pre-unseal-attribution.txt` (chmod 400).
3. That file hashed → `6aac3425ea176773640a9df0f0f5f9f04cedf38ac43c09c4421d61fb18db4012`; hash written into the run LEDGER.
4. **Only then** was the sealed mapping read.
5. Addendum 1 re-declared the two INVALID seeds under fresh codes without modifying the original sealed mapping (original still matches `12b99d19…`).

## 3. Opaque build codes

**Declared 14 (from `build-codes.txt`):**

`CB3-765E83F6`, `CB3-9BCA973A`, `CB3-64AD6A99`, `CB3-E3B693C3`, `CB3-C800260F`, `CB3-19ADDA1E`, `CB3-3EA05CEE`, `CB3-EF73E1C2`, `CB3-F2DCA05A`, `CB3-946C00E7`, `CB3-00388901`, `CB3-D70ADA46`, `CB3-353A7445`, `CB3-A34521C8`

**INVALID re-declarations (from `.redeclared-codes`):**

`CB3-F3218376`, `CB3-48A0396A`

## 4. Build ledger (terminal)

Copied from the frozen run `LEDGER.md` (operator package). Times are Z on 2026-10-24.

| Build | Tester | Status | Teardown | Frozen attribution | Seed (post-unseal) | Dist artifact sha256 |
| --- | --- | --- | --- | --- | --- | --- |
| CB3-765E83F6 | blind-01 | COMPLETE | yes | DEFECT DETECTED | S3 | `03a68e2747afd11c5125b3fff2002a35fc5e01c5a4e6380c54ca59b86561ac45` |
| CB3-9BCA973A | blind-02 | COMPLETE | yes | DEFECT DETECTED | S2 | `c8909f76ca2dbdb35259591c64454e5f666142c0655f14e48ff27c77c363d338` |
| CB3-64AD6A99 | blind-03 | COMPLETE | yes | DEFECT DETECTED | S5 | `62ed3fb8ca566ae7f8cdc3325d71394520c119b24196c227408b57d21441229e` |
| CB3-E3B693C3 | blind-04 | COMPLETE | yes | NO DEFECT REPORTED | **CLEAN** | `053305b3eb8395ce2a04ee0f485867e20877352832d24d4791e15cf431b003ad` |
| CB3-C800260F | blind-06 | COMPLETE | yes | DEFECT DETECTED | S7 | `ff0485ddb3ad88b6bdbfadaf9daceea0713f055302ac66fc0b40c3ec850458f2` |
| CB3-19ADDA1E | blind-05 | COMPLETE | yes | DEFECT DETECTED | S4 | `d3d53f9bc7e72f5dc05a88ca19aa51db605a66ea0a7b553ed9c95ed3fe7bef3a` |
| CB3-3EA05CEE | — | INVALID | yes | n/a (tester LOST; 0 scripts) | S9 (re-declared) | `a21a33cf55d2aef30152f0a1925b6602d4081ad54e774daa7e68308ce98ecad9` |
| CB3-EF73E1C2 | — | INVALID | yes | n/a (tester LOST mid-run; unauditable) | S12 (re-declared) | `0f775cf7559126c4cbed26612948d1913a71cfa5854d05763064643668979c97` |
| CB3-F2DCA05A | blind-07 | COMPLETE | yes | DEFECT DETECTED | M04 | `8e38955d2783a7416a3af6775ef96b3fbd20ebb4062f2f0f2af54627d97933f2` |
| CB3-946C00E7 | blind-08 | COMPLETE | yes | DEFECT DETECTED | S1 | `670ea29303d030fc04d95422d34ca89ab51ea2d2bebfde8578466c129eb1d977` |
| CB3-00388901 | blind-09 | COMPLETE | yes | DEFECT DETECTED | M26 | `7c6268ee60ad7040bc22ab4c4ae015b6f5d774f42ed281019665c82820fd1d58` |
| CB3-D70ADA46 | blind-10 | COMPLETE | yes | DEFECT DETECTED | M01 | `63c02d722912cf8c46b55babdf2e250c8019971cf8446080283c702dc1af55fd` |
| CB3-353A7445 | blind-11 | COMPLETE | yes | DEFECT DETECTED | S6 | `468a10b5ec3c28010942801af884577c9b146bb62d59584aa8e1e8f3b26816dc` |
| CB3-A34521C8 | blind-12 | COMPLETE | yes | DEFECT DETECTED | S8 | `bc697bbcc76b2353f01fb0cb8916cc1e4aaf52de395ae0af716e2ca2724a5c61` |
| CB3-F3218376 | blind-13 | COMPLETE | yes | DEFECT DETECTED | S9 | `c9382584f2ab5d50d290f94c8bacddb4e7020362b63c66623ef3b25eacb50d2b` |
| CB3-48A0396A | blind-14 | COMPLETE | yes | DEFECT DETECTED | S12 | `4dd4dfc09f338f3b51e0551b8caf26da8b3ff2f8e9a8ce17ba838dd08c58f011` |

## 5. Clean + seeded detection table (post-unseal)

From frozen LEDGER post-unseal adjudication. Match = declared finding condition vs blinded observation.

| Build | Seed | Match | Discriminating observation (frozen) |
| --- | --- | --- | --- |
| CB3-E3B693C3 | CLEAN | YES | Only row attributed NO DEFECT REPORTED; discriminating routes walked and reported healthy |
| CB3-946C00E7 | S1 | YES | Scored 2nd team; host + projector credited 1st; deduct/partial/manual identical; 3/3 |
| CB3-9BCA973A | S2 | YES | Answer on projector at Lock; host still HOST ONLY; 3/3 |
| CB3-765E83F6 | S3 | YES | Host offered Display open ~4–5 s after projector closed, then self-healed |
| CB3-19ADDA1E | S4 | YES | Both names typed, field focused → Start DISABLED + “Team Nimbus still needs a name.” + “1 of 2 named”; repaired on blur |
| CB3-64AD6A99 | S5 | YES | Final expiry relabelled Undo to “Undo response time up”; that Undo inert |
| CB3-353A7445 | S6 | YES, NARROWER | Completion context `Final unique-winner completion` while standings showed Tied for 1st ×2; projector said tie; **no** team named Winner |
| CB3-C800260F | S7 | YES | Reset leaked prior-class ledger onto new class; survived reload; 4/4 |
| CB3-A34521C8 | S8 | YES | Pressed Buzzer 2 (mapped Blue) → host named Red; swapped mapping → every press named Blue; 5/5 |
| CB3-F3218376 | S9 | YES | Board expiry Undo read `Undo time up`, enabled + inert 3×3; Final path correct on same build |
| CB3-48A0396A | S12 | YES | Both cards’ Delete removed title-first `Court B Final Qualification`, reporting success; 4/4 |
| CB3-00388901 | M26 | YES | Fresh mapped keyboard buzz ignored; “key is still held down”; 9/9 |
| CB3-F2DCA05A | M04 | YES | Save showed Saved; typed title discarded; spreadsheet import success with empty library explained as same Save stub |
| CB3-D70ADA46 | M01 | YES | Home Resume class enabled but inert; 3/3 |

**FINAL SEED ROUTES: 13/13 VALID** on this candidate (pre-run gates carried from the byte-identical product/test tree previously measured at `d8c212eaabc5eeb0f95b49743bb4cc57dd449485`, with S8/S12 route corrections landed in #190 on `a1af00f9…`).

## 6. CB3-19ADDA1E — objective observation rule (exemplar)

Frozen report `reports/CB3-19ADDA1E.md` + LEDGER:

- Tester’s own summary said “I found no functional defect” and classed the CBJ-03 sighting as friction.
- Verbatim observation still hit **both** limbs of the brief’s CBJ-03 finding condition **before** blur: Start DISABLED **and** “Team Nimbus still needs a name.” / “1 of 2 named”.
- **Rule recorded:** attribution follows the brief’s stated objective finding condition and the teacher-visible facts reported in order — **not** the tester’s severity adjective. Conversely, CLEAN requires discriminating routes performed and reported healthy, not mere absence of complaint.
- Frozen attribution: **DEFECT DETECTED** (S4).

## 7. Harness-version boundary (`controls()` mid-run)

External run tooling (not repository product code). Frozen per-tester `app.mjs` sha256 values:

| `app.mjs` sha256 | Builds that retained that file |
| --- | --- |
| `59b60236237fd76c3ffb94aa158b0384984ea980101624ab27f30945e2c1255b` | `CB3-765E83F6`, `CB3-9BCA973A`, `CB3-64AD6A99`, `CB3-E3B693C3`, `CB3-C800260F` |
| `abb5961280da2a879f622aabb35779f1f78ccfc9cc91c2c2e636ef53aa0ee16e` | `CB3-19ADDA1E` and all later rows (including INVALID + re-declarations) |

Campaign record: early `controls()` returned at the first zero-size control (`return`) instead of skipping (`continue`), truncating the generic control inventory. Corrected mid-run to `abb59612…`. Impact assessment in the frozen LEDGER/JOURNAL: the bug can only under-report controls; discriminating routes used visible text / role-label locators; completed early testers reached CBJ-01..CBJ-11 with nothing “not reached” / “not supplied”; **no frozen attribution depended on the faulty inventory**. Testers before and after the correction did **not** run byte-identical helper code — that is a fact of this run, not silently erased.

Also recorded: `tester-down.sh` (`532edae761273b9a1df6f1ab21df98b1ba386e9768427364cd4e481f8e9a15fe`) used early; `tester-down2.sh` (`619949f36b4833f8cb82c264c1f31f5bc8a7e6e5dfe0b655c7c9f3fb6cad6259`) later. Final `.rt/app.mjs` on disk is the corrected `abb59612…`.

Receiver / serve tooling hashes (final `.rt/`):

| file | sha256 |
| --- | --- |
| `.rt/receiver-sim.mjs` | `ba5a1622c93309c6a020a76b024846d94e51e702a8aeb1f2a1ac6c0bc035f609` |
| `.rt/serve.mjs` | `ae3709e3131d331dc3b395e7e0763e0bef3c29d30ec6f6624364cef5ab0560d2` |

## 8. Unsupported-receiver owner follow-up (non-blocking)

Frozen LEDGER limitations + JOURNAL carry-forward:

- Unsupported receiver is **correctly refused** (`openCalls=0`).
- Missing piece is **teacher-visible acknowledgement**, not refusal correctness.
- Raised unprompted by **6 of 6** early completed testers; seen again later.
- Disposition: **OWNER / CLASSROOM-FEEL FOLLOW-UP**. Not a seeded defect. Not a Court B failure. Not repaired by this docs transfer.

Related non-blocking carry-forward also recorded: after `Reset this class session`, host can allow `Start Round 1` while header still reads `Names incomplete`.

## 9. Evidence-class honesty / limitations carried with PASS

From frozen LEDGER (not smoothed):

- Apparatus not byte-identical across rows (section 7).
- Rows 1–6: operator digests in `reports/*.md`; no tester-authored `REPORT.md` retained for those builds (step scripts remain).
- Rows 7–13: tester’s own unedited `reports/raw/*.REPORT.md` primary.
- Row 14 (`CB3-48A0396A`): raw report **OPERATOR-TRANSCRIBED** (tester Write refused); 83 step scripts first-hand.
- **Simulated buzzers only.** No Sony/Namtai physical claim (brief rule 6). Physical behaviour remains a separate Q7 / physical session.
- Cleanup verified at end: run-owned servers 0, chromium 0, ports 4801–4816 free; repo clean during qualification (campaign record).

## 10. Prior Court A / Delta (transfer context — not re-run here)

Campaign record states these were executed against the byte-identical product/test tree at `d8c212eaabc5eeb0f95b49743bb4cc57dd449485` and carried to `a1af00f9…` on that basis (not re-asserted as freshly re-run on the squash SHA in this receipt):

- HISTORICAL COURT A REGISTER: PASS (campaign)
- DELTA COURT A: PASS (10 killed / 0 survivors)
- FINAL SEED ROUTES: 13/13 VALID
- TEST-LAYER LIVE / INSTRUCTION-LAYER DISCRIMINATING: 13/13

## 11. Program boundary after this PASS

| Claim | Verdict |
| --- | --- |
| Court B black-box teacher run on `a1af00f9…` | **PASS** |
| TEST TRUST | **TRUSTWORTHY FOR OWNER HANDOFF** (software-functional; simulated where noted) |
| OWNER FUNCTIONAL HANDOFF | **ELIGIBLE** (software-functional qualification) |
| SOFTWARE FUNCTIONAL QUALIFICATION | **STOPS HERE** for this candidate |
| Physical Sony / Namtai facts | **NOT CLAIMED** by this run |
| S05 parent terminalization | **still OPEN / NOT TERMINAL** (unchanged) |
| S04D / S06 | **still NOT AUTHORIZED** |
| Windows physical / projector-audio / clean-room / signing / notarization / auto-update / public teacher release | **still open / NOT CLAIMED** |
| Independent review of this docs PR | **not self-certified** |

## 12. Non-claims

This receipt does **not**:

- change product, tests, seeds, or qualification apparatus in the repository;
- merge itself;
- self-certify independent review or exact-head CI;
- convert simulation into physical PASS;
- rewrite historical receipts that correctly said Court B NOT RUN on earlier candidates;
- issue a new PRE-Q7 `OWNER-PLAYTHROUGH-ELIGIBLE` superseding Q7 HOLD physical facts;
- close S05 parent, S04D, S06, signing, or release gates.
