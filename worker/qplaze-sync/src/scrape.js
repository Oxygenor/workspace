import { chromium } from 'playwright'
import { config } from './config.js'
import { ERROR_CODES, SyncError } from './errors.js'

// This instance ("Qplaze KanBoard") is a custom Laravel + Inertia.js SPA —
// NOT the open-source kanboard.org project despite the name. Confirmed via
// a one-off debug dump (see git history for the temporary /debug-html
// route, since removed): every Inertia page embeds a `data-page` attribute
// holding a JSON blob of `{ component, props }` describing exactly what's
// rendered — including, for the board page, the full `board.lists[].cards[]`
// data directly as structured JSON. That's what extractCards() reads below;
// no DOM/CSS scraping of card markup is needed at all.
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
  // full page reload — waitForNavigation() would never fire. The URL
  // updates the instant a client-side visit lands, which is faster and
  // race-free compared to re-reading the data-page DOM attribute (that can
  // still show the old component for a moment after the URL has already
  // changed, during the Vue re-render).
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: LOGIN_TIMEOUT_MS })
  } catch {
    // Didn't leave /login within the timeout — treat as a failed login, checked below.
  }

  if (await detectCaptcha(page)) {
    throw new SyncError(ERROR_CODES.CAPTCHA_DETECTED)
  }

  if (new URL(page.url()).pathname.startsWith('/login')) {
    throw new SyncError(ERROR_CODES.LOGIN_FAILED)
  }
}

/**
 * Only cards assigned to the logged-in Qplaze account are synced — everyone
 * else's cards on the shared board are left out entirely. Each returned
 * card also carries its current Qplaze list id (`qplazeListId`) so the
 * apply RPC can mirror it to the mapped local column on every run,
 * including moving a previously-synced card if it was dragged to a
 * different list on the Qplaze side since the last sync.
 */
async function extractCards(page) {
  await page.goto(config.qplazeBoardUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })

  // Vue/Inertia hydration can lag slightly behind domcontentloaded — poll
  // for the board's own props (not just any data-page attribute) rather
  // than reading immediately.
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-page]')
        if (!el) return false
        try {
          const data = JSON.parse(el.getAttribute('data-page'))
          return data?.component === 'Boards/Show' && Array.isArray(data?.props?.board?.lists)
        } catch {
          return false
        }
      },
      { timeout: NAV_TIMEOUT_MS },
    )
  } catch {
    throw new SyncError(ERROR_CODES.STRUCTURE_CHANGED)
  }

  const inertiaPage = await readInertiaPage(page)
  const lists = inertiaPage?.props?.board?.lists
  const authUserId = inertiaPage?.props?.auth?.user?.id
  if (!Array.isArray(lists) || authUserId == null) {
    throw new SyncError(ERROR_CODES.STRUCTURE_CHANGED)
  }

  const cards = []
  for (const list of lists) {
    if (list?.is_archived || list?.is_archive) continue
    for (const card of list?.cards ?? []) {
      if (!card?.id || !card?.title || card?.is_archived) continue
      const isMine = Array.isArray(card.assignees) && card.assignees.some((a) => a?.id === authUserId)
      if (!isMine) continue
      cards.push({
        sourceId: String(card.id),
        title: card.title,
        sourceUrl: `${config.qplazeBoardUrl}#card-${card.id}`,
        qplazeListId: String(list.id),
      })
    }
  }
  return cards
}

/** Returns `{ sourceId, title, sourceUrl, qplazeListId }[]` for cards assigned to the logged-in user. Throws a SyncError (never a raw error) on any failure mode. */
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
