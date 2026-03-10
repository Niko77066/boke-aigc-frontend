function normalizeUrl(value?: string): string {
  return (value || '').trim().replace(/\/$/, '')
}

export function getApiBaseUrl(): string {
  return normalizeUrl(window.__APP_CONFIG__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL)
}

export function hasApiBaseUrl(): boolean {
  return Boolean(getApiBaseUrl())
}
