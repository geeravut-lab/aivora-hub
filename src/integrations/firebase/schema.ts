/**
 * Firestore layout for the hub. Shared by client and server so a rename can
 * never drift between the two.
 *
 * profiles/{uid}                     one doc per central user
 * lineIndex/{lineUserId}             { uid } — server-only reverse lookup
 * apps/{appId}                       launcher entry (social or business)
 * branding/singleton                 brand name, tagline, logo
 * userAppPrefs/{uid}/apps/{appId}    per-user show/hide
 * ssoTickets/{ticketHash}            server-only, one-time, short-lived
 */
export const COLLECTIONS = {
  profiles: "profiles",
  lineIndex: "lineIndex",
  apps: "apps",
  branding: "branding",
  userAppPrefs: "userAppPrefs",
  ssoTickets: "ssoTickets",
} as const;

export const BRANDING_DOC_ID = "singleton";

/** Sub-collection under userAppPrefs/{uid} holding one doc per app. */
export const USER_APP_PREFS_SUB = "apps";

export type AppCategory = "social" | "business";

export interface AppDoc {
  slug: string;
  name: string;
  description: string | null;
  url: string;
  icon: string;
  accent: string;
  category: AppCategory;
  allowedRedirectPrefixes: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface ProfileDoc {
  displayName: string | null;
  avatarUrl: string | null;
  lineUserId: string | null;
  email: string | null;
}

export interface BrandingDoc {
  brandName: string;
  tagline: string;
  logoUrl: string | null;
  logoPath: string | null;
}

export interface UserAppPrefDoc {
  hidden: boolean;
}

export interface SsoTicketDoc {
  uid: string;
  appId: string;
  appSlug: string;
  redirectUri: string;
  expiresAt: number;
  usedAt: number | null;
}

/** Roles live in Firebase custom claims, not in a collection. */
export type AppRole = "admin" | "user";

export function rolesFromClaims(claims: Record<string, unknown> | undefined): AppRole[] {
  return claims?.["admin"] === true ? ["admin", "user"] : ["user"];
}
