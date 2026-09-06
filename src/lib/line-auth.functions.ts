import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";

export const getLineLauncherConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getLiffId, getLineChannelId } = await import("./line.server");
  const liffId = getLiffId();
  return {
    liffId,
    configured: Boolean(liffId && getLineChannelId()),
  };
});

/**
 * Exchange a LIFF ID token for a Firebase custom token. The browser then calls
 * signInWithCustomToken() — no password, no magic link.
 */
export const signInWithLine = createServerFn({ method: "POST" })
  .inputValidator((input: { idToken: string }) => {
    if (!input?.idToken || typeof input.idToken !== "string" || input.idToken.length > 4096) {
      throw new Error("idToken ไม่ถูกต้อง");
    }
    return { idToken: input.idToken };
  })
  .handler(async ({ data }) => {
    const { verifyLineIdToken, upsertLineUser, mintCustomToken } = await import("./line.server");
    const identity = await verifyLineIdToken(data.idToken);
    const { uid } = await upsertLineUser(identity);
    return { customToken: await mintCustomToken(uid) };
  });

/**
 * Called after an email/Google sign-in, which never passes through the LINE
 * flow. It does the two things that flow does for free: makes sure a profile
 * document exists, and keeps the admin custom claim in step with ADMIN_EMAILS.
 * The client force-refreshes its ID token when the claim changed.
 *
 * Profiles are written only here and in the LINE flow, both with the Admin SDK,
 * which is why the security rules can keep the collection read-only for clients.
 */
export const syncMyAccount = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const { getUser, setDoc, syncAdminClaim } =
      await import("@/integrations/firebase/admin.server");
    const { COLLECTIONS } = await import("@/integrations/firebase/schema");

    const user = await getUser(context.userId);

    await setDoc(
      `${COLLECTIONS.profiles}/${context.userId}`,
      {
        displayName: user?.displayName ?? null,
        avatarUrl: user?.photoUrl ?? null,
        email: user?.email ?? context.email,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const isAdmin = await syncAdminClaim(context.userId, user?.email ?? context.email);
    return { isAdmin, changed: isAdmin !== context.isAdmin };
  });
