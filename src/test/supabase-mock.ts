import { vi } from 'vitest'

type QueryResult = { data: unknown; error: unknown }

/**
 * A minimal stand-in for the chainable Supabase query builder
 * (`supabase.from(table).insert(...).select().single()`), where every
 * chain method returns a thenable so callers can either keep chaining
 * (`.select().single()`) or `await` the builder directly after a bare
 * `.insert(...)`/`.update(...)` call, exactly like the real client.
 *
 * `resolveFor(table)` controls what the *next* awaited call for that table
 * resolves to — tests queue up one result per expected call, in order.
 */
export function createSupabaseMock() {
  const queues = new Map<string, QueryResult[]>()
  const calls: { table: string; method: string; args: unknown[] }[] = []

  function queueResult(table: string, result: QueryResult) {
    const existing = queues.get(table) ?? []
    existing.push(result)
    queues.set(table, existing)
  }

  function nextResult(table: string): QueryResult {
    const queue = queues.get(table)
    const result = queue?.shift()
    if (!result) {
      throw new Error(`No queued Supabase mock result for table "${table}" — call queueResult() first.`)
    }
    return result
  }

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {}
    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'is', 'not', 'in', 'order', 'limit', 'or']
    for (const method of chainMethods) {
      builder[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      })
    }
    builder.single = vi.fn(() => {
      calls.push({ table, method: 'single', args: [] })
      return Promise.resolve(nextResult(table))
    })
    // Makes a bare `await supabase.from(x).insert(y)` (no .select()/.single())
    // resolve just like the real (thenable) PostgrestFilterBuilder.
    builder.then = (resolve: (value: QueryResult) => void) => resolve(nextResult(table))
    return builder
  }

  function nextRpcResult(): QueryResult {
    const result = queues.get('__rpc__')?.shift()
    if (!result) {
      throw new Error('No queued Supabase mock RPC result — call queueRpcResult() first.')
    }
    return result
  }

  function queueRpcResult(result: QueryResult) {
    const existing = queues.get('__rpc__') ?? []
    existing.push(result)
    queues.set('__rpc__', existing)
  }

  const supabase = {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn((fn: string, args: unknown) => {
      calls.push({ table: '__rpc__', method: fn, args: [args] })
      return Promise.resolve(nextRpcResult())
    }),
  }

  return { supabase, queueResult, queueRpcResult, calls }
}
