/**
 * Server-only: mint Firebase Auth custom tokens for the child apps.
 *
 * Each child app lives in its own Firebase project, so each has its own service
 * account held as a secret here. Signing is RS256 via Web Crypto — no
 * firebase-admin, which means this runs in any runtime and adds nothing to the
 * function bundle.
 */
import {
  parseServiceAccount,
  signJwt,
  type ServiceAccount,
} from "@/integrations/firebase/google-auth.server";

const AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

/** app slug -> env var holding that project's service-account JSON */
const SERVICE_ACCOUNT_SECRETS: Record<string, string> = {
  tantun: "FIREBASE_SA_TANTUN",
  jaiklai: "FIREBASE_SA_JAIKLAI",
  harmony: "FIREBASE_SA_HARMONY",
  songmu: "FIREBASE_SA_SONGMU",
  youngwai: "FIREBASE_SA_YOUNGWAI",
};

function loadServiceAccount(appSlug: string): ServiceAccount | null {
  const secretName = SERVICE_ACCOUNT_SECRETS[appSlug];
  if (!secretName) return null;
  const raw = process.env[secretName];
  if (!raw) return null;
  try {
    return parseServiceAccount(raw, secretName);
  } catch (error) {
    console.error(`invalid service account in ${secretName}`, error);
    return null;
  }
}

export function hasFirebaseServiceAccount(appSlug: string): boolean {
  return loadServiceAccount(appSlug) !== null;
}

/**
 * Returns a Firebase custom token (valid 1 hour) for the given central user,
 * or null when the app has no service account configured.
 */
export async function mintFirebaseCustomToken(
  appSlug: string,
  uid: string,
  claims?: Record<string, unknown>,
): Promise<{ token: string; projectId: string } | null> {
  const account = loadServiceAccount(appSlug);
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: account.clientEmail,
    sub: account.clientEmail,
    aud: AUDIENCE,
    iat: now,
    exp: now + 3600,
    uid,
  };
  if (claims && Object.keys(claims).length > 0) payload["claims"] = claims;

  return { token: await signJwt(account, payload), projectId: account.projectId };
}
