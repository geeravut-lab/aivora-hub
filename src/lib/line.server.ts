/**
 * Server-only helpers for LINE Login (LIFF) -> a Firebase Auth session.
 * Never import this from client code.
 *
 * Firebase is a better fit here than the previous Supabase setup: verifying a
 * LINE ID token and then minting a session is exactly what custom tokens are
 * for, so the old generateLink/verifyOtp magic-link workaround is gone.
 */

export interface LineIdentity {
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  email: string | null;
}

export function getLineChannelId(): string | null {
  return process.env["LINE_CHANNEL_ID"] ?? null;
}

export function getLiffId(): string | null {
  return process.env["LINE_LIFF_ID"] ?? null;
}

/** Verify a LIFF ID token against LINE's API. Never trust liff.getProfile() alone. */
export async function verifyLineIdToken(idToken: string): Promise<LineIdentity> {
  const channelId = getLineChannelId();
  if (!channelId) throw new Error("LINE_CHANNEL_ID is not configured");

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("LINE id_token verify failed", res.status, text.slice(0, 300));
    throw new Error("ไม่สามารถยืนยันตัวตนกับ LINE ได้");
  }

  const payload = JSON.parse(text) as {
    sub?: string;
    name?: string;
    picture?: string;
    email?: string;
    aud?: string;
  };
  if (!payload.sub) throw new Error("LINE id_token ไม่มีข้อมูลผู้ใช้");
  if (payload.aud && payload.aud !== channelId)
    throw new Error("LINE id_token ไม่ตรงกับ channel นี้");

  return {
    lineUserId: payload.sub,
    displayName: payload.name ?? null,
    pictureUrl: payload.picture ?? null,
    email: payload.email ?? null,
  };
}

/**
 * Find or create the central user for this LINE identity.
 *
 * Three ways in, in order: the lineIndex reverse lookup, an existing account
 * with the same verified email (so LINE and email/Google land on one account),
 * or a fresh user. Unlike the Supabase version there is no synthetic
 * `@line.local` address — a LINE-only user simply has no email.
 */
export async function upsertLineUser(
  identity: LineIdentity,
): Promise<{ uid: string; email: string | null }> {
  const { getUser, getUserByEmail, createUser, getDoc, setDoc, syncAdminClaim } =
    await import("@/integrations/firebase/admin.server");
  const { COLLECTIONS } = await import("@/integrations/firebase/schema");

  const indexPath = `${COLLECTIONS.lineIndex}/${encodeURIComponent(identity.lineUserId)}`;
  const indexSnap = await getDoc(indexPath);

  let uid = indexSnap.exists ? ((indexSnap.data["uid"] as string | undefined) ?? null) : null;

  // The index can outlive the user (deleted by hand in the console).
  if (uid && !(await getUser(uid))) uid = null;

  if (!uid && identity.email) {
    const existing = await getUserByEmail(identity.email);
    if (existing) uid = existing.uid;
  }

  if (!uid) {
    const created = await createUser({
      email: identity.email,
      emailVerified: Boolean(identity.email),
      displayName: identity.displayName,
      photoUrl: identity.pictureUrl,
    });
    uid = created.uid;
  }

  const now = new Date();
  await setDoc(
    `${COLLECTIONS.profiles}/${uid}`,
    {
      displayName: identity.displayName,
      avatarUrl: identity.pictureUrl,
      lineUserId: identity.lineUserId,
      ...(identity.email ? { email: identity.email } : {}),
      updatedAt: now,
    },
    { merge: true },
  );

  await setDoc(indexPath, { uid, updatedAt: now }, { merge: true });

  const user = await getUser(uid);
  const email = user?.email ?? identity.email;
  await syncAdminClaim(uid, email);

  return { uid, email };
}

/** Mint a Firebase custom token the browser exchanges via signInWithCustomToken. */
export async function mintCustomToken(uid: string): Promise<string> {
  const { createCustomToken } = await import("@/integrations/firebase/admin.server");
  return createCustomToken(uid);
}
