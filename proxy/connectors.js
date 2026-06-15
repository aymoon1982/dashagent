/*
 * OAuth connector scaffold (Task 4) — personal-data sources behind the proxy.
 *
 * SCAFFOLD, not production-ready. It needs:
 *   1. A registered OAuth app per provider (client id/secret + redirect URI).
 *   2. A real token store (this keeps tokens in memory with no per-user session —
 *      acceptable only for a single-user personal deployment).
 *   3. A security review before exposing real personal data / write scopes.
 *
 * Env per connector (e.g. google): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   plus OAUTH_REDIRECT_URI (e.g. https://your-proxy/oauth/callback).
 */

export const CONNECTORS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/tasks.readonly',
    ],
    resources: {
      calendar: 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&singleEvents=true&orderBy=startTime&timeMin=NOW',
      tasks: 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=20',
    },
  },
};

const tokens = new Map(); // connector -> { access_token, refresh_token, expires_at }

export function envCreds(c) {
  const up = c.toUpperCase();
  return { id: process.env[`${up}_CLIENT_ID`], secret: process.env[`${up}_CLIENT_SECRET`], redirect: process.env.OAUTH_REDIRECT_URI };
}
export function isConfigured(c) { const e = envCreds(c); return !!(CONNECTORS[c] && e.id && e.secret && e.redirect); }

export function authUrl(c) {
  const def = CONNECTORS[c], e = envCreds(c);
  const u = new URL(def.authUrl);
  u.searchParams.set('client_id', e.id);
  u.searchParams.set('redirect_uri', e.redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('scope', def.scopes.join(' '));
  u.searchParams.set('state', c);
  return u.toString();
}

export async function exchange(c, code) {
  const def = CONNECTORS[c], e = envCreds(c);
  const body = new URLSearchParams({ code, client_id: e.id, client_secret: e.secret, redirect_uri: e.redirect, grant_type: 'authorization_code' });
  const r = await fetch(def.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (j.access_token) tokens.set(c, { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });
  return j;
}

export async function fetchResource(connector, resource) {
  const def = CONNECTORS[connector];
  if (!def) return { __error: `unknown connector ${connector}` };
  if (!isConfigured(connector)) return { __error: `connector ${connector} not configured on the proxy` };
  const tok = tokens.get(connector);
  if (!tok) return { __error: `account not connected — open /connect/${connector} on the proxy` };
  const url = def.resources[resource];
  if (!url) return { __error: `unknown resource ${resource}` };
  const r = await fetch(url.replace('NOW', new Date().toISOString()), { headers: { Authorization: `Bearer ${tok.access_token}` } });
  return r.json();
}
