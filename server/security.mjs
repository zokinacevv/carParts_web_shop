const requests = new Map()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 100

export function requestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function isRateLimited(key) {
  const now = Date.now()
  const current = requests.get(key)
  if (!current || now - current.startedAt > WINDOW_MS) {
    requests.set(key, { startedAt: now, count: 1 })
    return false
  }
  current.count += 1
  return current.count > MAX_REQUESTS
}

export function securityHeaders(response, id) {
  response.setHeader('x-request-id', id)
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin')
  response.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
}
