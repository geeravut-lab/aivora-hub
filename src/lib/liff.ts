import type { Liff } from "@line/liff";
import { getLineLauncherConfig } from "./line-auth.functions";

let liffPromise: Promise<Liff | null> | null = null;

/**
 * Initialise the LIFF SDK once per page load and reuse it everywhere.
 *
 * `liff.isInClient()` / `liff.openWindow()` only behave correctly after
 * `liff.init()`, so anything that needs to open an external browser must go
 * through here — not just the login flow.
 */
export function ensureLiff(): Promise<Liff | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (liffPromise) return liffPromise;

  liffPromise = (async () => {
    try {
      const config = await getLineLauncherConfig();
      if (!config.liffId) return null;
      const liff = (await import("@line/liff")).default;
      await liff.init({ liffId: config.liffId });
      return liff;
    } catch (error) {
      console.error("liff.init failed", error);
      return null;
    }
  })();

  return liffPromise;
}
