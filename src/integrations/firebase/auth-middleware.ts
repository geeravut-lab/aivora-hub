import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Verifies the caller's Firebase ID token and puts the identity in context.
 * Replaces the Supabase bearer-token middleware; the shape of `context` is the
 * same idea — `userId` plus the verified claims.
 */
export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: ไม่พบ request headers");

    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized: ไม่มี authorization header");
    if (!authHeader.startsWith("Bearer "))
      throw new Error("Unauthorized: รองรับเฉพาะ Bearer token");

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: token ไม่ถูกต้อง");

    const { verifyIdToken } = await import("./identity.server");
    const user = await verifyIdToken(token);
    if (!user?.uid) throw new Error("Unauthorized: token ไม่ถูกต้องหรือหมดอายุ");

    return next({
      context: {
        userId: user.uid,
        email: user.email,
        isAdmin: user.claims["admin"] === true,
        claims: user.claims,
      },
    });
  },
);
