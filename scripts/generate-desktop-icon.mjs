/**
 * Writes the desktop application icon using the same placeholder art as the
 * PWA icons. electron-builder derives icns/ico from this PNG.
 *
 * Regenerate with: node scripts/generate-desktop-icon.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '..', 'desktop', 'icons')
mkdirSync(outDir, { recursive: true })

const BG = [11, 27, 43]
const ACCENT = [58, 160, 255]
const HOST = [242, 169, 0]

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crc])
}

function encodePng(size) {
  const bytesPerPixel = 4
  const stride = size * bytesPerPixel
  const raw = Buffer.alloc((stride + 1) * size)
  const cx = size / 2
  const cy = size / 2
  const outer = size * 0.4
  const inner = size * 0.26
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy)
      let r = BG[0]
      let g = BG[1]
      let b = BG[2]
      if (dist <= outer && dist >= inner) {
        r = ACCENT[0]
        g = ACCENT[1]
        b = ACCENT[2]
      } else if (dist <= inner * 0.55) {
        r = HOST[0]
        g = HOST[1]
        b = HOST[2]
      }
      const off = y * (stride + 1) + 1 + x * bytesPerPixel
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const png = encodePng(512)
const dest = resolve(outDir, 'icon.png')
writeFileSync(dest, png)
console.log(`wrote desktop/icons/icon.png (512x512, ${png.length} bytes)`)
