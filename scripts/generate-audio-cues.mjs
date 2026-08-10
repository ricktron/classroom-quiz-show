#!/usr/bin/env node
/**
 * Deterministic generator for Slice 22 presentation-audio cue assets.
 *
 * - Node/platform primitives only (no npm audio deps).
 * - No remote requests, no third-party samples, no external file inputs.
 * - Emits mono PCM 16-bit little-endian WAV at 44.1 kHz.
 *
 * Usage: node scripts/generate-audio-cues.mjs
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'src/assets/audio/core')

const SAMPLE_RATE = 44_100
const CHANNELS = 1
const BITS_PER_SAMPLE = 16

/** @typedef {'active-claim' | 'positive-award' | 'incorrect' | 'timer-expired' | 'game-complete'} CueId */

/**
 * @typedef {{
 *   id: CueId
 *   filename: string
 *   durationSec: number
 *   oscillators: ReadonlyArray<{
 *     freq: number
 *     amp: number
 *     start: number
 *     end: number
 *     kind: 'sine' | 'triangle'
 *   }>
 * }} CueSpec
 */

/** @type {readonly CueSpec[]} */
const CUES = [
  {
    id: 'active-claim',
    filename: 'active-claim.wav',
    durationSec: 0.15,
    oscillators: [
      { freq: 880, amp: 0.42, start: 0, end: 0.15, kind: 'sine' },
      { freq: 1320, amp: 0.18, start: 0.02, end: 0.12, kind: 'sine' },
    ],
  },
  {
    id: 'positive-award',
    filename: 'positive-award.wav',
    durationSec: 0.3,
    oscillators: [
      { freq: 523.25, amp: 0.28, start: 0, end: 0.12, kind: 'sine' },
      { freq: 659.25, amp: 0.3, start: 0.08, end: 0.22, kind: 'sine' },
      { freq: 783.99, amp: 0.32, start: 0.16, end: 0.3, kind: 'sine' },
    ],
  },
  {
    id: 'incorrect',
    filename: 'incorrect.wav',
    durationSec: 0.27,
    oscillators: [
      { freq: 311.13, amp: 0.3, start: 0, end: 0.18, kind: 'triangle' },
      { freq: 233.08, amp: 0.22, start: 0.1, end: 0.27, kind: 'sine' },
    ],
  },
  {
    id: 'timer-expired',
    filename: 'timer-expired.wav',
    durationSec: 0.42,
    oscillators: [
      { freq: 740, amp: 0.28, start: 0, end: 0.1, kind: 'sine' },
      { freq: 0, amp: 0, start: 0.1, end: 0.16, kind: 'sine' },
      { freq: 740, amp: 0.28, start: 0.16, end: 0.26, kind: 'sine' },
      { freq: 0, amp: 0, start: 0.26, end: 0.32, kind: 'sine' },
      { freq: 554.37, amp: 0.3, start: 0.32, end: 0.42, kind: 'sine' },
    ],
  },
  {
    id: 'game-complete',
    filename: 'game-complete.wav',
    durationSec: 0.78,
    oscillators: [
      { freq: 392, amp: 0.22, start: 0, end: 0.22, kind: 'sine' },
      { freq: 523.25, amp: 0.24, start: 0.16, end: 0.4, kind: 'sine' },
      { freq: 659.25, amp: 0.26, start: 0.32, end: 0.58, kind: 'sine' },
      { freq: 783.99, amp: 0.28, start: 0.48, end: 0.78, kind: 'sine' },
      { freq: 987.77, amp: 0.12, start: 0.58, end: 0.78, kind: 'sine' },
    ],
  },
]

/**
 * @param {number} phase
 * @param {'sine' | 'triangle'} kind
 */
function wave(phase, kind) {
  if (kind === 'triangle') {
    const t = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    return 1 - Math.abs((t / Math.PI) - 1) * 2
  }
  return Math.sin(phase)
}

/**
 * Tiny attack/release envelope to avoid digital clicks.
 * @param {number} t
 * @param {number} start
 * @param {number} end
 */
function envelope(t, start, end) {
  if (t < start || t >= end) return 0
  const attack = 0.008
  const release = 0.03
  const local = t - start
  const dur = end - start
  let gain = 1
  if (local < attack) gain = local / attack
  const fromEnd = dur - local
  if (fromEnd < release) gain = Math.min(gain, fromEnd / release)
  return Math.max(0, Math.min(1, gain))
}

/**
 * @param {CueSpec} spec
 * @returns {{ samples: Float32Array, peak: number }}
 */
function synthesize(spec) {
  const n = Math.round(spec.durationSec * SAMPLE_RATE)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE
    let sum = 0
    for (const osc of spec.oscillators) {
      if (osc.freq <= 0 || osc.amp <= 0) continue
      const env = envelope(t, osc.start, osc.end)
      if (env === 0) continue
      const phase = 2 * Math.PI * osc.freq * t
      sum += wave(phase, osc.kind) * osc.amp * env
    }
    samples[i] = sum
  }

  let peak = 0
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(samples[i]))
  // Conservative headroom below clipping.
  const targetPeak = 0.72
  const scale = peak > 0 ? targetPeak / peak : 1
  for (let i = 0; i < n; i += 1) samples[i] *= scale
  peak = 0
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(samples[i]))
  return { samples, peak }
}

/**
 * @param {Float32Array} samples
 * @returns {Buffer}
 */
function encodeWav(samples) {
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8
  const byteRate = SAMPLE_RATE * blockAlign
  const dataSize = samples.length * blockAlign
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(CHANNELS, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff)
    buffer.writeInt16LE(int16, offset)
    offset += 2
  }
  return buffer
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  /** @type {Array<Record<string, unknown>>} */
  const report = []
  let totalBytes = 0

  for (const cue of CUES) {
    const { samples, peak } = synthesize(cue)
    const wav = encodeWav(samples)
    const path = join(OUT_DIR, cue.filename)
    writeFileSync(path, wav)
    const sha256 = createHash('sha256').update(wav).digest('hex')
    totalBytes += wav.length
    report.push({
      id: cue.id,
      filename: cue.filename,
      bytes: wav.length,
      durationSec: Number((samples.length / SAMPLE_RATE).toFixed(6)),
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitDepth: BITS_PER_SAMPLE,
      peak: Number(peak.toFixed(6)),
      sha256,
      path: `src/assets/audio/core/${cue.filename}`,
    })
  }

  // Determinism check: re-synthesize and compare hashes without writing.
  for (const cue of CUES) {
    const { samples } = synthesize(cue)
    const wav = encodeWav(samples)
    const sha256 = createHash('sha256').update(wav).digest('hex')
    const onDisk = createHash('sha256').update(readFileSync(join(OUT_DIR, cue.filename))).digest('hex')
    if (sha256 !== onDisk) {
      throw new Error(`Non-deterministic generation for ${cue.id}`)
    }
  }

  console.log(JSON.stringify({ totalBytes, cues: report }, null, 2))
}

main()
