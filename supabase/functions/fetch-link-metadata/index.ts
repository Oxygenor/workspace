// Supabase Edge Function: fetch-link-metadata
//
// Called directly by the Workspace SPA (from the "reading list" module,
// src/features/reading-list/api.ts) right after a link is added, to resolve
// a page's <title> and favicon for display. This exists purely because
// browsers block cross-origin fetches of arbitrary third-party pages' raw
// HTML — a server-side Deno function has no such restriction, so it acts as
// a small fetch-and-parse proxy.
//
// Unlike `telegram-webhook` / `telegram-digest` / `ics-feed`, this function
// IS called by our own authenticated frontend (via `supabase.functions
// .invoke`, which attaches the caller's session JWT), so it must be
// deployed WITHOUT `--no-verify-jwt` — Supabase's platform verifies the
// caller for us before the request even reaches this code. Because of that,
// there's no need for a service-role (or any) Supabase client here: this
// function never touches the database, it only fetches and parses HTML.
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

interface LinkMetadata {
  title: string | null
  faviconUrl: string | null
}

const FETCH_TIMEOUT_MS = 8000
// <head> is always near the top of a well-formed page — capping how much of
// the body we read/parse avoids pathological cases (huge pages, infinite
// streams) turning a metadata lookup into a slow/expensive operation.
const MAX_BYTES_TO_READ = 50 * 1024

async function readBodyPrefix(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''

  const decoder = new TextDecoder()
  let result = ''
  let bytesRead = 0

  try {
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      result += decoder.decode(value, { stream: true })
    }
  } finally {
    // Stop pulling more of the response than we need.
    await reader.cancel().catch(() => {})
  }

  return result
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null
  const decoded = match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  return decoded.length > 0 ? decoded : null
}

function extractFaviconHref(html: string): string | null {
  // Matches <link rel="icon" href="..."> / rel="shortcut icon", in either
  // attribute order, single or double quoted.
  const linkTagPattern = /<link\s+[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*>/gi
  const tags = html.match(linkTagPattern)
  if (!tags) return null

  for (const tag of tags) {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i)
    if (hrefMatch) return hrefMatch[1]
  }
  return null
}

async function resolveMetadata(url: string): Promise<LinkMetadata> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Some sites refuse requests with no user agent / accept headers.
      'User-Agent': 'Mozilla/5.0 (compatible; WorkspaceLinkPreview/1.0)',
      Accept: 'text/html',
    },
  })

  const html = await readBodyPrefix(response, MAX_BYTES_TO_READ)

  const title = extractTitle(html)
  const faviconHref = extractFaviconHref(html)
  const faviconUrl = faviconHref
    ? new URL(faviconHref, url).toString()
    : new URL('/favicon.ico', url).toString()

  return { title, faviconUrl }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const jsonResponse = (body: LinkMetadata) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json()
    const url = typeof body?.url === 'string' ? body.url : null
    if (!url) {
      return jsonResponse({ title: null, faviconUrl: null })
    }

    const metadata = await resolveMetadata(url)
    return jsonResponse(metadata)
  } catch (error) {
    // Never surface raw fetch/parse errors to the caller — a link that
    // can't be resolved (dead site, timeout, malformed HTML, non-HTML
    // content, etc.) just falls back to showing the raw URL client-side.
    console.error('fetch-link-metadata error', error)
    return jsonResponse({ title: null, faviconUrl: null })
  }
})
