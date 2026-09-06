import { ensureLiff } from "./liff";

/** LINE in-app browser honours openExternalBrowser=1 by opening the OS default browser. */
export function withExternalBrowser(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("openExternalBrowser", "1");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/** LINE's in-app browser (not LIFF) identifies itself in the user agent. */
export function isLineInAppBrowser(): boolean {
  return typeof navigator !== "undefined" && / Line\//i.test(navigator.userAgent);
}

/**
 * Always hand off to the device's default browser.
 *
 * Inside LINE we use liff.openWindow({ external: true }) with the URL kept
 * clean: on Android, combining it with openExternalBrowser=1 makes LINE both
 * launch the external browser AND navigate its own in-app browser (the Launcher
 * view) to the app, so the parameter is only used for the non-LIFF fallback.
 * Outside LINE we just open a new tab and leave the Launcher tab untouched.
 */
export async function openInDefaultBrowser(rawUrl: string) {
  try {
    const liff = await ensureLiff();
    if (liff?.isInClient()) {
      liff.openWindow({ url: rawUrl, external: true });
      return;
    }
    if (isLineInAppBrowser()) {
      window.location.href = withExternalBrowser(rawUrl);
      return;
    }
  } catch {
    /* not in LINE / liff not initialised — fall through */
  }
  // With `noopener`, some browsers intentionally return `null` even when the
  // new tab opened successfully. Do not use that return value as a fallback,
  // otherwise the Launcher tab is navigated to the same app as well.
  window.open(rawUrl, "_blank", "noopener,noreferrer");
}
