/**
 * LIFF appends any sub-path of the LIFF URL (e.g. https://liff.line.me/{id}/business)
 * to the endpoint URL as a `liff.state` query parameter. The LIFF SDK only applies it
 * during `liff.init()`, which we skip when the user already has a session — so the
 * Launcher would stay on "/" instead of opening the requested page.
 *
 * LIFF must be initialised before we apply the path. Changing location before
 * `liff.init()` makes Android LINE lose the LIFF context; a later
 * `liff.openWindow({ external: true })` can then navigate the in-app view back
 * to the endpoint URL instead of opening the selected app externally.
 */
import { ensureLiff } from "./liff";

export async function resolveLiffStatePathAfterInit(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const state = params.get("liff.state");
  if (!state) return null;

  let target: string;
  try {
    target = decodeURIComponent(state);
  } catch {
    target = state;
  }
  if (!target.startsWith("/")) return null;

  // Let the SDK consume liff.state and establish the LIFF client context first.
  // It normally performs the deep-link navigation itself. The code below is a
  // fallback for clients that leave the endpoint URL unchanged after init.
  await ensureLiff();
  if (window.location.pathname === new URL(target, window.location.origin).pathname) return null;

  params.delete("liff.state");
  const rest = params.toString();
  const url = new URL(target, window.location.origin);
  if (rest) {
    for (const [key, value] of new URLSearchParams(rest)) {
      url.searchParams.set(key, value);
    }
  }
  const next = url.pathname + url.search + url.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash)
    return null;
  return next;
}
