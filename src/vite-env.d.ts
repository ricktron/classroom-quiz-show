/// <reference types="vite/client" />

/** Injected at build time by Vite (`__CQS_SOURCE_SHA__`); may be unset in unit tests. */
declare const __CQS_SOURCE_SHA__: string | undefined

interface ImportMetaEnv {
  readonly VITE_CQS_RUNTIME?: string
}

declare module '*.wav' {
  const src: string
  export default src
}
/// <reference types="vite-plugin-pwa/client" />
