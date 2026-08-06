import { chromium } from 'playwright'
import { config } from './config.js'
import { ERROR_CODES, SyncError } from './errors.js'

// This instance ("Qplaze KanBoard") is a custom Laravel + Inertia.js SPA —
// NOT the open-source kanboard.org project despite the name. Confirmed via
// a one-off debug dump (see git history for the temporary /debug-html
// route): every Inertia page embeds a `data-page` attribute holding a JSON
// blob of `{ component, props }` describing exactly what's rendered — this
// is far more reliable than guessing CSS classes, since it's the app's own
// routing state, not markup that a theme/version bump could silently change.
const SELECTORS = {
  usernameField: 'input#email, input[type="email"]',
  passwordField: 'input#password, input[type="password"]',
  loginSubmit: 'button[type="submit"]',
  captchaMarkers: [
    'iframe[src*="recaptcha"]',
    '[class*="captcha" i]',
    'input[name*="captcha" i]',
    'input[name*="verification_code" i]',
    'input[autocomplete="one-time-code"]',
  ],
  // TODO: unverified placeholders — extractCards()/scrapeBoard() (the real
  // /sync path) isn't usable until these are fixed from a /debug-html dump
  // of the actual board page. dumpBoardHtml() doesn't depend on these.
  boardColumn: '.board-column, [class*="column-container" i]',
  taskLinkPrimary: 'a[href*="/task/"]',
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

/** Reads Inertia's own `data-page` prop blob — `null` if absent/unparseable (unexpected page structure). */
async function readInertiaPage(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-page]')
    if (!el) return null
    try {
      return JSON.parse(el.getAttribute('data-page'))
    } catch {
      return null
    }
  })
}

async function isOnLoginPage(page) {
  const inertiaPage = await readInertiaPage(page)
  if (inertiaPage) return inertiaPage.component === 'Auth/Login'
  // No Inertia data-page found at all — fall back to a DOM guess rather
  // than assuming either state blindly.
  return Boolean(await page.locator(SELECTORS.usernameField).count())
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
  try {
    // Inertia hydrates the login form client-side after domcontentloaded —
    // wait for it rather than checking immediately (which races hydration).
    await usernameField.waitFor({ timeout: LOGIN_TIMEOUT_MS })
    await passwordField.waitFor({ timeout: LOGIN_TIMEOUT_MS })
  } catch {
    throw new SyncError(ERROR_CODES.STRUCTURE_CHANGED)
  }

  await usernameField.fill(config.qplazeLogin)
  await passwordField.fill(config.qplazePassword)
  await page.locator(SELECTORS.loginSubmit).first().click()

  // Inertia does client-side routing via the History API on success, not a
  // full page reload — waitForNavigation() would never fire. Poll the
  // data-page component instead: it flips away from Auth/Login the moment
  // Inertia swaps in the post-login page, success or redirect alike.
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-page]')
        if (!el) return false
        try {
          return JSON.parse(el.getAttribute('data-page'))?.component !== 'Auth/Login'
        } catch {
          return false
        }
      },
      { timeout: LOGIN_TIMEOUT_MS },
    )
  } catch {
    // Didn't flip within the timeout — treat as a failed login, checked below.
  }

  if (await detectCaptcha(page)) {
    throw new SyncError(ERROR_CODES.CAPTCHA_DETECTED)
  }

  if (await isOnLoginPage(page)) {
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

// TEMPORARY, for fixing SELECTORS against the real instance — remove once
// scraping works reliably. Deliberately returns raw page HTML/props (unlike
// every other function in this file), so only reachable via a
// bearer-protected debug route, never logged/stored anywhere.
export async function dumpBoardHtml() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    let stage = 'before-login'
    try {
      await login(page)
      stage = 'after-login'
    } catch (loginError) {
      stage = `login-failed:${loginError instanceof SyncError ? loginError.code : 'unknown'}`
    }
    const afterLoginInertiaPage = await readInertiaPage(page).catch(() => null)
    const afterLoginUrl = page.url()

    await page.goto(config.qplazeBoardUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => {})
    // Give Inertia/Vue a moment to hydrate the board page's own data-page
    // props before reading them.
    await page.waitForTimeout(2000)
    const boardInertiaPage = await readInertiaPage(page).catch(() => null)
    const html = await page.content()
    const url = page.url()
    return { stage, afterLoginUrl, afterLoginInertiaPage, url, boardInertiaPage, html }
  } finally {
    await browser.close().catch(() => {})
  }
}

/** Returns `{ sourceId, title, sourceUrl }[]`. Throws a SyncError (never a raw error) on any failure mode. */
export async function scrapeBoard() {
  let browser
  try {
    // --no-sandbox is required for Chromium to launch in most containerized
    // environments (Docker/Railway etc. don't grant the kernel privileges
    // Chromium's sandbox normally needs) — the container itself provides
    // the isolation instead.
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  } catch (error) {
    // Safe to log here specifically: nothing page-related has happened yet,
    // so this can only be a browser-launch/environment problem (missing
    // deps, sandbox restrictions), never real page content.
    console.error('qplaze-sync-worker: chromium.launch failed', error instanceof Error ? error.message : '')
    throw new SyncError(ERROR_CODES.INTERNAL)
  }

  try {
    const page = await browser.newPage()
    await login(page)
    return await extractCards(page)
  } catch (error) {
    // Never let Playwright's native error object escape this function past
    // this point — its .message can embed page/ARIA snapshot content (real
    // card titles).
    if (error instanceof SyncError) throw error
    throw new SyncError(ERROR_CODES.INTERNAL)
  } finally {
    await browser.close().catch(() => {})
  }
}
