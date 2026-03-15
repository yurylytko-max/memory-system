const encoder = new TextEncoder()

export const SITE_AUTH_COOKIE = "memory-system-session"
export const LOGIN_PATH = "/login"

function getSitePassword() {
  return process.env.SITE_PASSWORD?.trim() ?? ""
}

function getSiteAuthSecret() {
  return process.env.SITE_AUTH_SECRET?.trim() || getSitePassword()
}

export function isSitePasswordProtectionEnabled() {
  return getSitePassword().length > 0
}

async function sha256Hex(value: string) {
  const bytes = encoder.encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function createSiteAuthToken(password = getSitePassword()) {
  return sha256Hex(`${password}:${getSiteAuthSecret()}`)
}

export async function isValidSitePassword(password: string) {
  const configuredPassword = getSitePassword()

  if (!configuredPassword) {
    return true
  }

  return password === configuredPassword
}

export async function hasValidSiteAuthCookie(cookieValue?: string) {
  if (!isSitePasswordProtectionEnabled()) {
    return true
  }

  if (!cookieValue) {
    return false
  }

  const expectedToken = await createSiteAuthToken()

  return cookieValue === expectedToken
}
