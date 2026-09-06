import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";

/**
 * Issue a one-time SSO ticket for a registered app.
 * The child app exchanges it server-side at /api/public/sso/exchange.
 */
export const issueSsoTicket = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { appSlug: string; redirectUri: string }) => {
    if (!input?.appSlug || typeof input.appSlug !== "string" || input.appSlug.length > 64) {
      throw new Error("appSlug ไม่ถูกต้อง");
    }
    if (
      !input?.redirectUri ||
      typeof input.redirectUri !== "string" ||
      input.redirectUri.length > 2048
    ) {
      throw new Error("redirectUri ไม่ถูกต้อง");
    }
    return { appSlug: input.appSlug, redirectUri: input.redirectUri };
  })
  .handler(async ({ data, context }) => {
    const { newTicket, hashTicket, isAllowedRedirect, TICKET_TTL_SECONDS } =
      await import("./sso.server");
    const { queryCollection, setDoc } = await import("@/integrations/firebase/admin.server");
    const { COLLECTIONS } = await import("@/integrations/firebase/schema");

    const [appDoc] = await queryCollection(COLLECTIONS.apps, "slug", data.appSlug, 1);
    if (!appDoc) throw new Error("ไม่พบแอปนี้ในระบบ");

    if (appDoc.data["isActive"] === false) throw new Error("แอปนี้ถูกปิดใช้งานอยู่");

    const prefixes = (appDoc.data["allowedRedirectPrefixes"] as string[] | undefined) ?? [];
    if (!isAllowedRedirect(data.redirectUri, prefixes)) {
      throw new Error("ปลายทางนี้ยังไม่อยู่ใน allow-list ของแอป");
    }

    const ticket = newTicket();
    // The hash is the document id, so the exchange is a single point read and
    // a duplicate ticket can never exist.
    await setDoc(`${COLLECTIONS.ssoTickets}/${hashTicket(ticket)}`, {
      uid: context.userId,
      appId: appDoc.id,
      appSlug: data.appSlug,
      redirectUri: data.redirectUri,
      expiresAt: Date.now() + TICKET_TTL_SECONDS * 1000,
      usedAt: null,
      createdAt: new Date(),
    });

    const target = new URL(data.redirectUri);
    target.searchParams.set("sso_ticket", ticket);
    return { redirectTo: target.toString() };
  });
