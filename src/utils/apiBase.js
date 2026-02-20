function isLikelyLocalHost(host) {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  )
}

/**
 * Reads VITE_API_BASE_URL and normalizes it to an absolute URL.
 * Accepts:
 * - https://example.com
 * - http://localhost:3001
 * - example.com (assumes https)
 * - localhost:3001 (assumes http)
 */
export function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim()
  const fallback = 'http://localhost:3001'

  if (!raw) return fallback

  // Already absolute
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '')

  // Handle accidental leading slashes
  const withoutLeading = raw.replace(/^\/+/, '')

  // Try to infer protocol
  try {
    const u = new URL(`http://${withoutLeading}`)
    const proto = isLikelyLocalHost(u.hostname) ? 'http' : 'https'
    return `${proto}://${withoutLeading}`.replace(/\/+$/, '')
  } catch {
    return fallback
  }
}

