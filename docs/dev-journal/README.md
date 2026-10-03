# CQS Development Journal

This directory preserves **reflective development learning** for Classroom Quiz
Show. It exists so product, design, qualification, and process lessons do not have
to be reconstructed from chat history after the fact.

It is **not implementation authority**.

Authority remains, in order, with observed repository truth, canonical product
and status documents, accepted ADRs/owner decisions, current plans, and current
handoff routing. See `AGENTS.md` and
`docs/governance/EXECUTION-GUIDANCE.md`.

## Surfaces

- [CQS-DEVELOPMENT-JOURNAL.md](CQS-DEVELOPMENT-JOURNAL.md) — chronological,
  append-oriented narrative of meaningful development/qualification episodes.
- [PRODUCT-TO-MVP-LESSONS.md](PRODUCT-TO-MVP-LESSONS.md) — reusable candidate
  lessons distilled from repeated evidence. These are process/design candidates,
  not product canon.

## Entry rule

Substantial delivery, review, repair, qualification, Court, PRE-Q7, owner
playthrough, and post-playthrough polish work should add a journal entry when it
creates meaningful new learning.

An entry should capture, when relevant:

1. objective / expected behavior;
2. what actually happened;
3. defect or proof gap discovered;
4. why existing evidence did not catch it;
5. repair / decision;
6. owner effort or friction;
7. what worked in the process;
8. what caused churn;
9. reusable candidate principle;
10. evidence links (PR, SHA, ADR, matrix row, receipt).

Keep **observation**, **interpretation**, and **candidate reusable lesson**
distinct. A journal observation does not change CQS architecture or status.

## Owner-effort rule

Owner effort is a product-development signal.

When a workflow makes the owner repeatedly translate developer concepts, manually
prove machine-observable behavior, repeat avoidable qualification, or carry
context that the repository should have carried, record:

- the friction;
- its root cause;
- the preventive control that could eliminate it next time.

The goal is not merely to document pain. The goal is to convert pain into a
cheaper, more reliable future process.
