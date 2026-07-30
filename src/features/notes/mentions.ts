/**
 * Parsing/resolution helpers for `[[Name]]` backlink mentions inside note
 * content. Kept dependency-free (no React/Supabase) so it can be used both
 * by the Preview renderer and by the save-time link-sync logic in `api.ts`.
 */

export const MENTION_REGEX = /\[\[([^\]]+)\]\]/g
export const MENTION_HREF_PREFIX = 'mention://'

/** Extracts the distinct, trimmed `[[Name]]` occurrences from raw content. */
export function extractMentionNames(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(MENTION_REGEX)) {
    const name = match[1]?.trim()
    if (name) names.add(name)
  }
  return [...names]
}

function encodeMentionName(name: string): string {
  // encodeURIComponent leaves `(` and `)` untouched, which can otherwise
  // break an unbalanced markdown link destination like `(mention://Foo))`.
  return encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

/** Builds the placeholder `mention://Name` href used inside preprocessed markdown. */
export function toMentionHref(name: string): string {
  return `${MENTION_HREF_PREFIX}${encodeMentionName(name)}`
}

/** Extracts the mention name from an `href`, or `null` if it isn't a mention link. */
export function parseMentionHref(href: string | undefined | null): string | null {
  if (!href || !href.startsWith(MENTION_HREF_PREFIX)) return null
  try {
    return decodeURIComponent(href.slice(MENTION_HREF_PREFIX.length))
  } catch {
    return null
  }
}

/**
 * Rewrites every `[[Name]]` occurrence into a `[Name](mention://Name)` markdown
 * link, so the existing `react-markdown` pipeline can parse it unchanged and a
 * custom `components.a` override can render mentions distinctly.
 */
export function preprocessMentions(content: string): string {
  return content.replace(MENTION_REGEX, (match, rawName: string) => {
    const name = rawName.trim()
    if (!name) return match
    return `[${name}](${toMentionHref(name)})`
  })
}

/** Case-insensitive, trim-tolerant lookup of a mention name among workspace items. */
export function resolveMentionItem<T extends { name: string }>(name: string, items: readonly T[]): T | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return items.find((item) => item.name.trim().toLowerCase() === normalized)
}
