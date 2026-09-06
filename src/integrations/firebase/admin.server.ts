/**
 * Server-only façade over the Firebase REST helpers. Bypasses security rules —
 * never import this from a route file or a *.functions.ts module, both of which
 * ship to the client bundle. Load it inside a handler instead:
 *
 *   const { getUser } = await import("@/integrations/firebase/admin.server");
 */
export {
  createCustomToken,
  createUser,
  getUser,
  getUserByEmail,
  setCustomClaims,
  verifyIdToken,
  type AuthUser,
} from "./identity.server";

export {
  getDoc,
  queryCollection,
  setDoc,
  updateDocIfUnchanged,
  type DocSnapshot,
} from "./firestore.server";

import { getUser, setCustomClaims } from "./identity.server";

/** Emails that get the admin claim on sign-in. Comma-separated env var. */
export function adminEmails(): string[] {
  return (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Grant or revoke the admin claim so it always matches ADMIN_EMAILS.
 * Returns true when the user should be treated as an admin.
 */
export async function syncAdminClaim(uid: string, email: string | null): Promise<boolean> {
  const shouldBeAdmin = Boolean(email && adminEmails().includes(email.toLowerCase()));
  const user = await getUser(uid);
  const isAdmin = user?.claims["admin"] === true;

  if (shouldBeAdmin === isAdmin) return isAdmin;

  const claims = { ...(user?.claims ?? {}) };
  if (shouldBeAdmin) {
    claims["admin"] = true;
  } else {
    delete claims["admin"];
  }
  await setCustomClaims(uid, claims);
  return shouldBeAdmin;
}
