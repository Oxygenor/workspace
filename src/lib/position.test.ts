import { describe, expect, it } from 'vitest'

import { computeGapPosition, nextAppendPosition } from './position'

describe('computeGapPosition', () => {
  it('returns the default gap when there are no neighbours', () => {
    expect(computeGapPosition(null, null)).toBe(1000)
  })

  it('returns a position before `after` when there is no `before`', () => {
    expect(computeGapPosition(null, 500)).toBe(-500)
  })

  it('returns a position after `before` when there is no `after`', () => {
    expect(computeGapPosition(500, null)).toBe(1500)
  })

  it('returns the midpoint between two neighbours', () => {
    expect(computeGapPosition(1000, 2000)).toBe(1500)
  })
})

describe('nextAppendPosition', () => {
  it('returns the default gap for an empty list', () => {
    expect(nextAppendPosition([])).toBe(1000)
  })

  it('returns a position after the last sibling', () => {
    expect(nextAppendPosition([{ position: 1000 }, { position: 2000 }])).toBe(3000)
  })
})
