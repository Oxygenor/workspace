const POSITION_GAP = 1000

/** Computes a fractional position placing an item between `before` and `after` siblings (either may be absent). */
export function computeGapPosition(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_GAP
  if (before === null) return (after as number) - POSITION_GAP
  if (after === null) return before + POSITION_GAP
  return (before + after) / 2
}

export function nextAppendPosition<T extends { position: number }>(siblings: T[]): number {
  if (siblings.length === 0) return POSITION_GAP
  return siblings[siblings.length - 1].position + POSITION_GAP
}
