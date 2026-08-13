/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CQS_RUNTIME?: string
}

declare module '*.wav' {
  const src: string
  export default src
}
/// <reference types="vite-plugin-pwa/client" />
