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
 * settings/aiTranslation             provider + model for admin-side translation
 * private/aiTranslation              server-only: the provider API key
 */
export const COLLECTIONS = {
  profiles: "profiles",
  lineIndex: "lineIndex",
  apps: "apps",
  branding: "branding",
  userAppPrefs: "userAppPrefs",
  ssoTickets: "ssoTickets",
  settings: "settings",
  private: "private",
} as const;

export const AI_TRANSLATION_DOC_ID = "aiTranslation";

export const BRANDING_DOC_ID = "singleton";

/** Sub-collection under userAppPrefs/{uid} holding one doc per app. */
export const USER_APP_PREFS_SUB = "apps";

export type AppCategory = "social" | "business";

export interface AppDoc {
  slug: string;
  /** Thai — the admin's primary language and the fallback for every other one. */
  name: string;
  /** English; null means "not translated yet", the UI falls back to `name`. */
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
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
  brandNameEn: string | null;
  tagline: string;
  taglineEn: string | null;
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

export const AI_PROVIDERS = ["gemini", "openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** What the browser may see about the translation setup — never the key. */
export interface AiTranslationSettingsDoc {
  provider: AiProvider | null;
  model: string | null;
  hasApiKey: boolean;
  /** Last four characters of the stored key, so an admin can tell keys apart. */
  apiKeyHint: string | null;
}

/** Roles live in Firebase custom claims, not in a collection. */
export type AppRole = "admin" | "user";

export function rolesFromClaims(claims: Record<string, unknown> | undefined): AppRole[] {
  return claims?.["admin"] === true ? ["admin", "user"] : ["user"];
}
