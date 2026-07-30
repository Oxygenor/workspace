/**
 * Client-side PIN hashing for the notes "locked" privacy screen. This is
 * intentionally NOT real security — the PIN, hash, and content all live in
 * the same browser session and RLS already gates row access by workspace
 * membership. It just hides a note's content from a casual glance.
 */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
