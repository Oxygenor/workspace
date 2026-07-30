import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

/**
 * Persists the TanStack Query cache to localStorage so the PWA can render
 * last-known data immediately on a cold, offline start. This is read-only
 * offline support — mutations still require a live connection to Supabase.
 */
export const queryPersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'workspace-query-cache',
  throttleTime: 1000,
})
