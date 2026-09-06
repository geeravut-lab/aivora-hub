import { createMiddleware } from "@tanstack/react-start";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./client";

/**
 * Firebase restores the persisted session asynchronously, so `auth.currentUser`
 * is null for the first moments after a page load. Server functions called in
 * that window would go out unauthenticated; wait for the first auth state
 * instead of racing it.
 */
let readyPromise: Promise<User | null> | undefined;

export function authReady(): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!readyPromise) {
    readyPromise = new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        () => {
          unsubscribe();
          resolve(null);
        },
      );
    });
  }
  return readyPromise;
}

/**
 * Registered as a global `functionMiddleware` in src/start.ts. Without it the
 * browser never attaches a bearer token to server-function RPCs and every
 * authenticated server function fails.
 */
export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const user = auth.currentUser ?? (await authReady());
    const token = user ? await user.getIdToken() : null;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
