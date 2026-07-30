/**
 * Minimal markdown heading extraction for the notes Table of Contents.
 * Notes content is a plain markdown string (see `NotesPage`'s `<Textarea>`),
 * so headings are recognized by the standard ATX convention (`#`, `##`,
 * `###` at the start of a line) rather than parsed from rendered HTML.
 */
export interface HeadingEntry {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'heading'
  )
}

/**
 * Extracts `#`/`##`/`###` headings from a markdown string, in document
 * order, skipping lines inside fenced code blocks. Ids are slugified from
 * heading text with a numeric suffix to disambiguate duplicates, matching
 * the order react-markdown assigns to rendered `h1`/`h2`/`h3` nodes for the
 * same content (see `buildMarkdownComponents` in `NotesPage.tsx`).
 */
export function extractHeadings(markdown: string): HeadingEntry[] {
  const headings: HeadingEntry[] = []
  const seenSlugs = new Map<string, number>()
  let inCodeFence = false

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim()

    if (line.startsWith('```') || line.startsWith('~~~')) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence) continue

    const match = /^(#{1,3})\s+(.+)$/.exec(line)
    if (!match) continue

    const text = match[2].trim()
    if (!text) continue

    const baseSlug = slugify(text)
    const count = seenSlugs.get(baseSlug) ?? 0
    seenSlugs.set(baseSlug, count + 1)

    headings.push({ id: count === 0 ? baseSlug : `${baseSlug}-${count}`, text, level: match[1].length })
  }

  return headings
}
