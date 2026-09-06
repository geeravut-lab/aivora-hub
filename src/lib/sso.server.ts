/** Server-only SSO ticket helpers. Never import from client code. */
import { createHash, randomBytes } from "node:crypto";

export const TICKET_TTL_SECONDS = 60;

export function hashTicket(ticket: string): string {
  return createHash("sha256").update(ticket).digest("hex");
}

export function newTicket(): string {
  return randomBytes(32).toString("base64url");
}

/** Only allow redirects that a registered app explicitly declares. */
export function isAllowedRedirect(redirectUri: string, prefixes: string[]): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") return false;
  return prefixes.some((prefix) => prefix.length > 8 && redirectUri.startsWith(prefix));
}
