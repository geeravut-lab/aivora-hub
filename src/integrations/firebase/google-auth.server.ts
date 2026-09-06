/**
 * Server-only Google service-account plumbing: RS256 signing and OAuth access
 * tokens, using Web Crypto alone.
 *
 * Why not firebase-admin? Its Firestore client pulls in @google-cloud/firestore,
 * which loads gRPC .proto files relative to __dirname. That does not survive
 * bundling into an ESM serverless function — the build succeeds and then throws
 * "__dirname is not defined" the first time Firestore is touched. Everything the
 * hub needs from Google is a plain REST call, so it makes them directly.
 */

export interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

type RawServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

/** Parse a service-account JSON blob held in an environment variable. */
export function parseServiceAccount(raw: string, source: string): ServiceAccount {
  let parsed: RawServiceAccount;
  try {
    parsed = JSON.parse(raw) as RawServiceAccount;
  } catch {
    throw new Error(`${source} ไม่ใช่ JSON ที่ถูกต้อง`);
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(`${source} ขาด project_id / client_email / private_key`);
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // Pasting the JSON into a one-line env var keeps newlines as literal "\n".
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

let _hubAccount: ServiceAccount | undefined;

/** The hub's own service account. */
export function hubServiceAccount(): ServiceAccount {
  if (_hubAccount) return _hubAccount;
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) {
    throw new Error(
      "ยังไม่ได้ตั้ง FIREBASE_SERVICE_ACCOUNT — วาง service account JSON ทั้งก้อนเป็น env var",
    );
  }
  _hubAccount = parseServiceAccount(raw, "FIREBASE_SERVICE_ACCOUNT");
  return _hubAccount;
}

export function hubProjectId(): string {
  return hubServiceAccount().projectId;
}

export function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function importPrivateKey(account: ServiceAccount): Promise<CryptoKey> {
  const cached = keyCache.get(account.clientEmail);
  if (cached) return cached;
  const promise = crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  keyCache.set(account.clientEmail, promise);
  return promise;
}

/** Sign a JWT with the service account's key. */
export async function signJwt(
  account: ServiceAccount,
  payload: Record<string, unknown>,
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = await importPrivateKey(account);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(signature)}`;
}

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

/**
 * OAuth 2.0 access token for the given scopes, via the JWT bearer grant.
 * Cached until a minute before expiry, so a warm function reuses one token.
 */
export async function accessToken(
  account: ServiceAccount = hubServiceAccount(),
  scopes: string[] = [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/identitytoolkit",
  ],
): Promise<string> {
  const cacheKey = `${account.clientEmail}|${scopes.join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(account, {
    iss: account.clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("google token exchange failed", res.status, text.slice(0, 300));
    throw new Error("ขอ access token จาก Google ไม่สำเร็จ");
  }

  const body = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Google ไม่ได้คืน access_token");

  tokenCache.set(cacheKey, {
    token: body.access_token,
    expiresAt: Date.now() + ((body.expires_in ?? 3600) - 60) * 1000,
  });
  return body.access_token;
}
