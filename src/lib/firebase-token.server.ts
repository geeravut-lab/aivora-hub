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

/**
 * Every uid the hub signs carries this prefix. Do not remove it.
 *
 * A child app's Firebase project also holds accounts its users made themselves
 * (Google, email/password), and Firebase never generates a uid starting with
 * "aivora:". Keeping the namespace separate is what stops a token minted here
 * from landing on top of one of those accounts, so the child apps check the
 * prefix before they accept a token and reject anything without it. The
 * convention predates the hub — the child apps minted their own tokens this way
 * — and their guard is still in place, so dropping it breaks all five of them.
 */
const UID_PREFIX = "aivora:";

/** Namespaced uid for the token. Already-prefixed input is left alone. */
function namespacedUid(uid: string): string {
  return uid.startsWith(UID_PREFIX) ? uid : `${UID_PREFIX}${uid}`;
}

/**
 * Slugs are typed by an admin and stored in Firestore, so they are untrusted
 * input on the way to a process.env lookup. Only this shape gets through.
 */
const APP_SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/**
 * Derive the secret name from the slug rather than keeping a table of them:
 * adding a Social app in the Launcher UI is then enough on its own, with no
 * code change standing between the admin and a working SSO handoff.
 * `tantun` -> `FIREBASE_SA_TANTUN`, `life-os` -> `FIREBASE_SA_LIFE_OS`.
 */
function serviceAccountEnvName(appSlug: string): string | null {
  if (!APP_SLUG_PATTERN.test(appSlug)) return null;
  return `FIREBASE_SA_${appSlug.toUpperCase().replace(/[-.]/g, "_")}`;
}

function loadServiceAccount(appSlug: string): ServiceAccount | null {
  const secretName = serviceAccountEnvName(appSlug);
  if (!secretName) return null;
  const raw = process.env[secretName];
  // An app with no service account configured is an ordinary state, not a
  // failure — the exchange answers `firebase: null` and the child app falls
  // back to its own login.
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
 *
 * `uid` comes in raw and is namespaced on the way into the token; callers keep
 * passing the hub's own id. `claims.aivora_user_id` stays raw on purpose —
 * that is what a child app maps back to a user here.
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
    uid: namespacedUid(uid),
  };
  if (claims && Object.keys(claims).length > 0) payload["claims"] = claims;

  return { token: await signJwt(account, payload), projectId: account.projectId };
}
