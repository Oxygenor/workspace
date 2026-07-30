import { describe, expect, it } from 'vitest'

import { extractMentionNames, parseMentionHref, preprocessMentions, resolveMentionItem, toMentionHref } from './mentions'

describe('extractMentionNames', () => {
  it('returns an empty array when there are no mentions', () => {
    expect(extractMentionNames('just plain text')).toEqual([])
  })

  it('extracts trimmed, deduplicated mention names', () => {
    expect(extractMentionNames('See [[Project Alpha]] and [[ Project Alpha ]] and [[Roadmap]].')).toEqual([
      'Project Alpha',
      'Roadmap',
    ])
  })

  it('ignores empty mentions', () => {
    expect(extractMentionNames('[[   ]]')).toEqual([])
  })
})

describe('toMentionHref / parseMentionHref', () => {
  it('round-trips a simple name', () => {
    const href = toMentionHref('Project Alpha')
    expect(parseMentionHref(href)).toBe('Project Alpha')
  })

  it('round-trips names containing parentheses', () => {
    const href = toMentionHref('Roadmap (Q3)')
    expect(parseMentionHref(href)).toBe('Roadmap (Q3)')
  })

  it('returns null for non-mention hrefs', () => {
    expect(parseMentionHref('https://example.com')).toBeNull()
    expect(parseMentionHref(undefined)).toBeNull()
  })
})

describe('preprocessMentions', () => {
  it('rewrites [[Name]] into a mention:// markdown link', () => {
    expect(preprocessMentions('See [[Project Alpha]] for details.')).toBe(
      'See [Project Alpha](mention://Project%20Alpha) for details.',
    )
  })

  it('leaves the rest of the markdown untouched', () => {
    expect(preprocessMentions('# Title\n\n- item one\n- [[Linked Item]]')).toBe(
      '# Title\n\n- item one\n- [Linked Item](mention://Linked%20Item)',
    )
  })
})

describe('resolveMentionItem', () => {
  const items = [{ name: 'Project Alpha' }, { name: 'Roadmap' }]

  it('matches case-insensitively and trims whitespace', () => {
    expect(resolveMentionItem(' project alpha ', items)).toBe(items[0])
  })

  it('returns undefined when nothing matches', () => {
    expect(resolveMentionItem('Unknown', items)).toBeUndefined()
  })
})
