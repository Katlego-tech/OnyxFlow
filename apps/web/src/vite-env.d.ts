/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the DRF API lives. Defaults to the local `runserver` address. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
