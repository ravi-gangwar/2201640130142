const BASE_URL = 'http://20.244.56.144/evaluation-service';

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type AuthInput = {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
};

type TokenState = { token: string | null; expiresAt: number | null };
const tokenState: TokenState = { token: null, expiresAt: null };

// Use browser fetch when available, otherwise fall back to node-fetch dynamically
async function getFetch(): Promise<typeof fetch> {
  // @ts-ignore - in Node, fetch may not exist
  if (typeof fetch !== 'undefined') return fetch as unknown as typeof fetch;
  const mod = await import('node-fetch');
  return (mod.default as unknown) as typeof fetch;
}

async function fetchToken(authInput: AuthInput): Promise<string> {
  const f = await getFetch();
  const res = await f(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authInput),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const data: any = await res.json();
  const now = Math.floor(Date.now() / 1000);
  tokenState.token = data.access_token as string;
  tokenState.expiresAt = now + (data.expires_in ?? 300);
  return tokenState.token!;
}

async function getValidToken(authInput: AuthInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenState.token && tokenState.expiresAt && tokenState.expiresAt - now > 15) {
    return tokenState.token;
  }
  return fetchToken(authInput);
}

export function createLogger(authInput: AuthInput | { token: string }) {
  return async function log(stack: Stack, level: Level, pkg: string, message: string) {
    const token = 'token' in authInput ? authInput.token : await getValidToken(authInput);
    const f = await getFetch();
    const res = await f(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
    if (!res.ok) {
      console.error(`log failed ${res.status}`);
    }
  };
}


