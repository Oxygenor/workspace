// Standard Supabase Edge Function CORS boilerplate.
//
// These functions are invoked from three very different callers that can
// never send a browser-style `Origin` we could safely allowlist ahead of
// time: the Workspace SPA (browser, for the link-code flow), Telegram's own
// servers (webhook + outgoing digest), and third-party calendar apps
// (Google/Apple/Outlook fetching the ICS feed). A wildcard origin plus
// explicit `OPTIONS` preflight handling is the idiomatic Supabase pattern
// for this situation — see the official "Deploy to Production" / CORS guide
// in the Supabase Edge Functions docs.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/** Returns a 200 response for CORS preflight `OPTIONS` requests, or `null` if this isn't one. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
