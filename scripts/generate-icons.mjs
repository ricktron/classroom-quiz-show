/**
 * Generates restrained placeholder PWA icons WITHOUT any binary image tooling,
 * by encoding raw RGBA pixels into valid PNGs with Node's built-in zlib.
 *
 * Design: dark brand background (#0b1b2b) with a centered accent "spotlight"
 * ring — neutral, science-friendly, and clearly not imitating any commercial
 * game show. Regenerate with: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BG = [11, 27, 43] // #0b1b2b
const ACCENT = [58, 160, 255] // #3aa0ff
const HOST = [242, 169, 0] // #f2a900

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
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

function encodePng(size, draw) {
  const bytesPerPixel = 4
  const stride = size * bytesPerPixel
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size)
      const off = y * (stride + 1) + 1 + x * bytesPerPixel
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Solid background + accent ring + small host-amber dot for identity. */
function painter(maskable) {
  return (x, y, size) => {
    const cx = size / 2
    const cy = size / 2
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Maskable icons need a safe zone: keep art within ~80% radius.
    const outer = size * (maskable ? 0.34 : 0.4)
    const inner = size * (maskable ? 0.22 : 0.26)
    if (dist <= outer && dist >= inner) return [...ACCENT, 255]
    // small amber accent dot upper-right of center
    const hx = x - size * 0.5
    const hy = y - size * 0.5
    if (Math.sqrt(hx * hx + hy * hy) <= inner * 0.55) return [...HOST, 255]
    return [...BG, 255]
  }
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
]

for (const t of targets) {
  const png = encodePng(t.size, painter(t.maskable))
  writeFileSync(resolve(outDir, t.name), png)
  console.log(`wrote icons/${t.name} (${t.size}x${t.size}, ${png.length} bytes)`)
}
