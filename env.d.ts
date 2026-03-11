/// <reference types="vite/client" />

interface Window {
  __APP_CONFIG__?: {
    VITE_API_BASE_URL?: string
    VITE_CAPCUT_API_BASE_URL?: string
    VITE_CAPCUT_API_KEY?: string
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CAPCUT_API_BASE_URL?: string
  readonly VITE_CAPCUT_API_KEY?: string
}
