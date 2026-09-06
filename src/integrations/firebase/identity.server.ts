/**
 * Server-only Firebase Auth operations over the Identity Toolkit REST API.
 * Covers exactly what the hub needs: look a user up, create one, read and write
 * custom claims, verify an ID token, and mint a custom token.
 */
import { accessToken, hubProjectId, hubServiceAccount, signJwt } from "./google-auth.server";

const CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  claims: Record<string, unknown>;
}

type RawAccount = {
  localId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  customAttributes?: string;
};

function toUser(account: RawAccount): AuthUser {
  let claims: Record<string, unknown> = {};
  if (account.customAttributes) {
    try {
      claims = JSON.parse(account.customAttributes) as Record<string, unknown>;
    } catch {
      claims = {};
    }
  }
  return {
    uid: account.localId ?? "",
    email: account.email ?? null,
    displayName: account.displayName ?? null,
    photoUrl: account.photoUrl ?? null,
    claims,
  };
}

async function identityToolkit<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = await accessToken();
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${hubProjectId()}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // Callers turn specific failures into user-facing messages; log the detail.
    const error = new Error(`identitytoolkit ${method} ${res.status}: ${text.slice(0, 300)}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function lookup(body: Record<string, unknown>): Promise<AuthUser | null> {
  const data = await identityToolkit<{ users?: RawAccount[] }>("accounts:lookup", body);
  const account = data.users?.[0];
  return account?.localId ? toUser(account) : null;
}

export function getUser(uid: string): Promise<AuthUser | null> {
  return lookup({ localId: [uid] });
}

export function getUserByEmail(email: string): Promise<AuthUser | null> {
  return lookup({ email: [email] });
}

/**
 * Validate an ID token. Google checks the signature, issuer, audience and
 * expiry, so there is no local JWKS handling to get subtly wrong. A malformed
 * or expired token comes back as null rather than throwing.
 */
export async function verifyIdToken(idToken: string): Promise<AuthUser | null> {
  try {
    return await lookup({ idToken });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 400 || status === 401 || status === 403) return null;
    throw error;
  }
}

export async function createUser(input: {
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
  photoUrl?: string | null;
}): Promise<AuthUser> {
  const body: Record<string, unknown> = {};
  if (input.email) {
    body["email"] = input.email;
    body["emailVerified"] = input.emailVerified ?? false;
  }
  if (input.displayName) body["displayName"] = input.displayName;
  if (input.photoUrl) body["photoUrl"] = input.photoUrl;

  const data = await identityToolkit<{ localId?: string }>("accounts", body);
  if (!data.localId) throw new Error("สร้างบัญชีผู้ใช้ไม่สำเร็จ");

  return {
    uid: data.localId,
    email: input.email ?? null,
    displayName: input.displayName ?? null,
    photoUrl: input.photoUrl ?? null,
    claims: {},
  };
}

export async function setCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
  await identityToolkit("accounts:update", {
    localId: uid,
    customAttributes: JSON.stringify(claims),
  });
}

/** Mint a custom token for the hub's own project (uid = the hub user id). */
export async function createCustomToken(
  uid: string,
  claims?: Record<string, unknown>,
): Promise<string> {
  const account = hubServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: account.clientEmail,
    sub: account.clientEmail,
    aud: CUSTOM_TOKEN_AUDIENCE,
    iat: now,
    exp: now + 3600,
    uid,
  };
  if (claims && Object.keys(claims).length > 0) payload["claims"] = claims;
  return signJwt(account, payload);
}
