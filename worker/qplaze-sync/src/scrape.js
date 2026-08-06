import { chromium } from 'playwright'
import { config } from './config.js'
import { ERROR_CODES, SyncError } from './errors.js'

// Kanboard's standard (unthemed) markup — verified against the open-source
// kanboard.org templates, not against this specific instance/theme, since
// this worker was built without live access to kanboard.qplaze.com. If the
// instance uses a custom theme or a newer/older Kanboard version, these may
// need adjusting; keeping them as named constants here (rather than inline
// throughout the function) makes that a small, contained edit.
const SELECTORS = {
  usernameField: 'input[name="username"]',
  passwordField: 'input[name="password"]',
  loginSubmit: 'button[type="submit"], input[type="submit"]',
  // Any of these present after a login attempt means "not actually logged in".
  loginPageMarkers: ['input[name="username"]', 'input[name="password"]'],
  captchaMarkers: [
    'iframe[src*="recaptcha"]',
    '[class*="captcha" i]',
    'input[name*="captcha" i]',
    'input[name*="verification_code" i]',
    'input[autocomplete="one-time-code"]',
  ],
  // Present only once actually logged in — used as a *positive* assertion,
  // not just "absence of the login form" (a forced-password-change or ToS
  // interstitial page would fail the negative check too, but isn't handled
  // by it — waiting for a real logged-in-only element catches that case).
  loggedInMarker: 'a[href*="logout"], .dropdown-menu, #board',
  boardColumn: '.board-column, [class*="column-container" i]',
  // Primary: Kanboard renders each card as a link to its task page.
  taskLinkPrimary: 'a[href*="/task/"]',
  // Fallback: some themes/versions render cards via a data attribute
  // instead of (or in addition to) a plain anchor.
  taskLinkFallback: '[data-task-id]',
}

const NAV_TIMEOUT_MS = 30_000
const LOGIN_TIMEOUT_MS = 15_000

async function detectCaptcha(page) {
  for (const selector of SELECTORS.captchaMarkers) {
    if (await page.locator(selector).count()) return true
  }
  return false
}

async function isOnLoginPage(page) {
  for (const selector of SELECTORS.loginPageMarkers) {
    if (await page.locator(selector).count()) return true
  }
  return false
}

async function login(page) {
  await page.goto(config.qplazeBoardUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })

  const alreadyLoggedIn = !(await isOnLoginPage(page))
  if (alreadyLoggedIn) return

  if (await detectCaptcha(page)) {
    throw new SyncError(ERROR_CODES.CAPTCHA_DETECTED)
  }

  const usernameField = page.locator(SELECTORS.usernameField).first()
  const passwordField = page.locator(SELECTORS.passwordField).first()
  if (!(await usernameField.count()) || !(await passwordField.count())) {
    // Neither logged in nor a recognizable login form — the page structure
    // isn't what this scraper expects.
    throw new SyncError(ERROR_CODES.STRUCTURE_CHANGED)
  }

  await usernameField.fill(config.qplazeLogin)
  await passwordField.fill(config.qplazePassword)
  await page.locator(SELECTORS.loginSubmit).first().click()

  try {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: LOGIN_TIMEOUT_MS })
  } catch {
    // Some login flows update the page in place (no full navigation) — not
    // fatal by itself, the checks below decide success/failure.
  }

  if (await detectCaptcha(page)) {
    throw new SyncError(ERROR_CODES.CAPTCHA_DETECTED)
  }

  if (await isOnLoginPage(page)) {
    throw new SyncError(ERROR_CODES.LOGIN_FAILED)
  }

  // Positive assertion: don't just infer success from "no login form" —
  // wait for something that only exists once actually authenticated.
  try {
    await page.locator(SELECTORS.loggedInMarker).first().waitFor({ timeout: LOGIN_TIMEOUT_MS })
  } catch {
    throw new SyncError(ERROR_CODES.LOGIN_FAILED)
  }
}

async function extractCards(page) {
  await page.goto(config.qplazeBoardUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })

  try {
    await page.locator(SELECTORS.boardColumn).first().waitFor({ timeout: NAV_TIMEOUT_MS })
  } catch {
    throw new SyncError(ERROR_CODES.STRUCTURE_CHANGED)
  }

  const cards = await page.evaluate((sel) => {
    const seen = new Map()

    for (const el of document.querySelectorAll(sel.taskLinkPrimary)) {
      const href = el.getAttribute('href') || ''
      const match = href.match(/\/task\/(\d+)/)
      if (!match) continue
      const sourceId = match[1]
      const title = (el.textContent || '').trim()
      if (!title) continue
      seen.set(sourceId, { sourceId, title, sourceUrl: new URL(href, window.location.href).toString() })
    }

    for (const el of document.querySelectorAll(sel.taskLinkFallback)) {
      const sourceId = el.getAttribute('data-task-id')
      if (!sourceId || seen.has(sourceId)) continue
      const linkEl = el.matches('a') ? el : el.querySelector('a')
      const title = (linkEl ? linkEl.textContent : el.textContent || '').trim()
      if (!title) continue
      const href = linkEl ? linkEl.getAttribute('href') : null
      const sourceUrl = href ? new URL(href, window.location.href).toString() : window.location.href
      seen.set(sourceId, { sourceId, title, sourceUrl })
    }

    return Array.from(seen.values())
  }, SELECTORS)

  return cards
}

/** Returns `{ sourceId, title, sourceUrl }[]`. Throws a SyncError (never a raw error) on any failure mode. */
export async function scrapeBoard() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await login(page)
    return await extractCards(page)
  } catch (error) {
    // Never let Playwright's native error object escape this function — its
    // .message can embed page/ARIA snapshot content (real card titles).
    if (error instanceof SyncError) throw error
    throw new SyncError(ERROR_CODES.INTERNAL)
  } finally {
    await browser.close().catch(() => {})
  }
}
