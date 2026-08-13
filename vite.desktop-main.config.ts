import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * Bundles the Electron main process to CommonJS. Renderer code stays in the
 * existing Vite React build (`--mode desktop`). Electron is external.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'out/main',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: 'node20',
    ssr: true,
    rollupOptions: {
      input: resolve(__dirname, 'desktop/main.ts'),
      output: {
        format: 'cjs',
        entryFileNames: 'main.cjs',
        inlineDynamicImports: true,
      },
      external: ['electron', /^node:/],
    },
  },
})
