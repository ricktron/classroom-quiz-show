import { createGameDefinition, type GameDefinition } from './gameDefinition'
import { roundId, roundType, type RoundType } from './ids'
import { placeholderRound, type RoundDefinition } from './roundDefinition'

/**
 * Small, trusted in-memory sample definitions used by the host foundation
 * controls and by tests. These are NOT gameplay content — every round is the
 * non-gameplay placeholder type (except the deliberately-unsupported round used
 * to demonstrate fail-closed behavior).
 */

/** A round-type string with NO registered engine — used to prove fail-closed. */
export const UNSUPPORTED_SAMPLE_ROUND_TYPE: RoundType = roundType('unsupported-sample')

/** A three-round, all-placeholder sample game. */
export function createSampleGame(): GameDefinition {
  return createGameDefinition({
    id: 'sample-foundation-game',
    title: 'Foundation Sample Game',
    rounds: [
      placeholderRound('round-1', 'Round One'),
      placeholderRound('round-2', 'Round Two'),
      placeholderRound('round-3', 'Round Three'),
    ],
  })
}

/**
 * A sample whose second round references an UNREGISTERED type, so selecting it
 * exercises the unknown-round-type fail-closed path (host diagnostic + neutral
 * "unavailable" display). The unknown round's `config` is still plain data.
 */
export function createSampleGameWithUnsupportedRound(): GameDefinition {
  const unsupportedRound: RoundDefinition = {
    id: roundId('mystery-round'),
    type: UNSUPPORTED_SAMPLE_ROUND_TYPE,
    title: 'Mystery Round',
    config: { reason: 'this round type is intentionally not registered' },
  }
  return createGameDefinition({
    id: 'sample-with-unsupported',
    title: 'Foundation Sample (with an unsupported round)',
    rounds: [placeholderRound('supported-1', 'Supported Round'), unsupportedRound],
  })
}
