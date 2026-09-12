/**
 * UI language for the hub: Thai by default, English on request.
 *
 * Every user-facing string in the app UI lives here so a new screen can never
 * ship in one language only. `th` is the source of truth; `en` is typed
 * against it, so a key missing from either side fails typecheck.
 *
 * Admin-entered content (app names, branding) is stored per-language on the
 * document instead — see `localized()` for how the two fall back.
 */
import { createContext, useContext } from "react";

export type Lang = "th" | "en";

export const LANG_STORAGE_KEY = "aivora.lang";

const th = {
  // common
  "common.back": "กลับหน้าแรก",
  "common.save": "บันทึก",
  "common.cancel": "ยกเลิก",
  "common.edit": "แก้ไข",
  "common.retry": "ลองอีกครั้ง",
  "common.or": "หรือ",
  "common.unknownError": "ไม่ทราบสาเหตุ",
  "common.saveFailed": "บันทึกไม่สำเร็จ",
  "common.deleteFailed": "ลบไม่สำเร็จ",
  "common.language": "ภาษา",
  "common.logoAlt": "โลโก้ {brand}",
  "common.signOut": "ออกจากระบบ",
  "common.signedOut": "ออกจากระบบแล้ว",

  // root: 404 / error
  "root.notFound.title": "ไม่พบหน้านี้",
  "root.notFound.body": "หน้าที่คุณเปิดอาจถูกย้ายหรือไม่มีอยู่แล้ว",
  "root.error.title": "โหลดหน้านี้ไม่สำเร็จ",
  "root.error.body": "เกิดข้อผิดพลาดบางอย่าง ลองรีเฟรชอีกครั้งหรือกลับหน้าแรก",

  // launcher
  "launcher.social.heading": "แอปของคุณ",
  "launcher.social.subheading": "ล็อกอินครั้งเดียว ใช้ได้ทุกแอป",
  "launcher.business.heading": "แอปสำหรับธุรกิจ",
  "launcher.business.subheading": "เปิดแล้วเข้าสู่ระบบที่แอปนั้นเอง",
  "launcher.signingIn": "กำลังเข้าสู่ระบบ…",
  "launcher.needsSetup.title": "ยังไม่ได้ตั้งค่า LINE Login",
  "launcher.needsSetup.body":
    "ต้องใส่ LINE Channel ID / Channel Secret และ LIFF ID ก่อน จึงจะล็อกอินผ่าน LINE ได้",
  "launcher.signIn.title": "เข้าสู่ระบบเพื่อเริ่มใช้งาน",
  "launcher.signIn.body":
    "เปิดหน้านี้จาก LINE เพื่อล็อกอินอัตโนมัติ หรือเข้าสู่ระบบด้วยอีเมล/Google",
  "launcher.signIn.button": "เข้าสู่ระบบด้วยอีเมลหรือ Google",
  "launcher.hello": "สวัสดี",
  "launcher.you": "คุณ",
  "launcher.profileAlt": "โปรไฟล์ผู้ใช้",
  "launcher.manage": "จัดการ Launcher",
  "launcher.settings": "ตั้งค่า",
  "launcher.loadFailed": "โหลดรายการแอปไม่สำเร็จ",
  "launcher.empty": "ยังไม่มีแอปในกลุ่มนี้ — ผู้ดูแลระบบสามารถเพิ่มได้ในหน้าจัดการ Launcher",
  "launcher.toBusiness": "ไปที่แอปสำหรับธุรกิจ",
  "launcher.toSocial": "ไปที่แอปของคุณ (Social)",
  "launcher.noSso": "{app} ยังไม่ได้ตั้งค่า SSO — เปิดแบบปกติแทน",
  "launcher.openFailed": "เปิดแอปไม่สำเร็จ",

  // line login
  "line.noIdToken": "ไม่ได้รับ ID token จาก LINE",
  "line.failed": "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ",

  // auth
  "auth.displayName": "ชื่อที่แสดง",
  "auth.displayNamePlaceholder": "ชื่อของคุณ",
  "auth.defaultName": "ผู้ใช้",
  "auth.email": "อีเมล",
  "auth.password": "รหัสผ่าน",
  "auth.signIn": "เข้าสู่ระบบ",
  "auth.signUp": "สมัครสมาชิก",
  "auth.google": "เข้าสู่ระบบด้วย Google",
  "auth.toSignUp": "ยังไม่มีบัญชี? สมัครสมาชิก",
  "auth.toSignIn": "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ",
  "auth.accountCreated": "สร้างบัญชีแล้ว",
  "auth.err.invalidCredential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth.err.emailInUse": "อีเมลนี้มีบัญชีอยู่แล้ว — กดเข้าสู่ระบบแทน",
  "auth.err.weakPassword": "รหัสผ่านสั้นเกินไป ต้องอย่างน้อย 6 ตัวอักษร",
  "auth.err.tooMany": "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
  "auth.err.network": "เชื่อมต่อเครือข่ายไม่สำเร็จ",
  "auth.err.generic": "ดำเนินการไม่สำเร็จ",

  // sso authorize
  "sso.forwardFailed": "ส่งต่อการเข้าสู่ระบบไม่สำเร็จ",
  "sso.failedTitle": "ส่งต่อไม่สำเร็จ",
  "sso.forwarding": "กำลังส่งต่อไปยังแอป…",

  // settings
  "settings.title": "ตั้งค่าระบบ",
  "settings.lineStatus": "สถานะ LINE Login",
  "settings.lineChannel": "LINE Channel / LIFF",
  "settings.ready": "พร้อมใช้งาน",
  "settings.notConfigured": "ยังไม่ตั้งค่า",
  "settings.lineHelp":
    "ต้องตั้งค่า LINE_CHANNEL_ID, LINE_CHANNEL_SECRET และ LINE_LIFF_ID เป็น environment variable บน Netlify ก่อน จึงจะล็อกอินอัตโนมัติจากใน LINE ได้ — ดูวิธีสร้างค่าทั้งสามที่",
  "settings.lineGuide": "คู่มือตั้งค่า LINE Developers",
  "settings.apps.title": "แอปที่เชื่อมต่อ Aivora Launcher",
  "settings.apps.body":
    "เลือกได้ว่าจะแสดงแอปไหนบนหน้า Launcher ของคุณ (การตั้งค่านี้เป็นของคุณคนเดียว)",
  "settings.apps.showIn": "แสดง {app} ใน Launcher",
  "settings.apps.allowList": "Allow-list:",
  "settings.apps.noAllowList": "ยังไม่ได้ตั้ง (เปิดแบบไม่ SSO)",
  "settings.manage": "จัดการ Launcher (แอดมิน)",
  "settings.lineGuideButton": "คู่มือตั้งค่า LINE",
  "settings.ssoGuideButton": "คู่มือเชื่อมต่อ SSO",

  // admin
  "admin.onlyAdmin": "เฉพาะผู้ดูแลระบบ",
  "admin.onlyAdminBody":
    "บัญชีนี้ยังไม่มีสิทธิ์ admin จึงเข้าหน้าจัดการไม่ได้ — เพิ่มอีเมลนี้ใน ADMIN_EMAILS แล้วเข้าสู่ระบบใหม่",
  "admin.title": "จัดการ Launcher",
  "admin.social": "แอปกลุ่ม Social (ใช้ SSO)",
  "admin.business": "แอปกลุ่ม Business (ไม่ใช้ SSO)",
  "admin.brand.title": "แบรนด์ & โลโก้",
  "admin.brand.changeLogo": "เปลี่ยนโลโก้",
  "admin.brand.logoHint": "PNG, SVG หรือ WebP แนะนำสี่เหลี่ยมจัตุรัส",
  "admin.brand.name": "ชื่อแบรนด์",
  "admin.brand.tagline": "คำโปรย",
  "admin.brand.saved": "บันทึกชื่อแบรนด์แล้ว",
  "admin.brand.logoChanged": "เปลี่ยนโลโก้แล้ว",
  "admin.brand.uploadFailed": "อัปโหลดโลโก้ไม่สำเร็จ",
  "admin.th": "ไทย",
  "admin.en": "อังกฤษ",
  "admin.enHint": "ถ้าเว้นว่าง จะใช้ข้อความภาษาไทยแทนเมื่อผู้ใช้เลือกภาษาอังกฤษ",
  "admin.translate": "แปลด้วย AI",
  "admin.translating": "กำลังแปล…",
  "admin.translated": "แปลแล้ว — ตรวจทานก่อนบันทึก",
  "admin.translateFailed": "แปลไม่สำเร็จ",
  "admin.translateNeedsSource": "กรอกข้อความภาษาไทยก่อน",
  "admin.translateNotConfigured":
    "ยังไม่ได้ตั้งค่า AI สำหรับแปล — ตั้งได้ในหัวข้อ “AI สำหรับแปลภาษา” ด้านล่าง",
  "admin.apps.add": "เพิ่มแอป",
  "admin.apps.name": "ชื่อแอป",
  "admin.apps.slug": "slug",
  "admin.apps.url": "URL ของแอป",
  "admin.apps.description": "คำอธิบาย",
  "admin.apps.prefixes": "Allow-list ปลายทาง SSO (คนละบรรทัด)",
  "admin.apps.businessNote":
    "กลุ่ม Business เปิดแอปตรง ๆ ไม่ส่ง SSO ผู้ใช้จะไปล็อกอินที่แอปนั้นเอง",
  "admin.apps.icon": "ไอคอน (lucide)",
  "admin.apps.iconHint": "ใช้ชื่อจาก lucide.dev/icons เช่น sparkles, calendar, wallet",
  "admin.apps.iconUnknown": "ไม่รู้จักไอคอน “{icon}” — จะแสดงเป็น layout-grid แทน",
  "admin.apps.order": "ลำดับ",
  "admin.apps.active": "เปิดใช้งานใน Launcher",
  "admin.apps.inactive": "(ปิดใช้งาน)",
  "admin.apps.required": "ต้องกรอก slug, ชื่อ และ URL",
  "admin.apps.saved": "บันทึกแอปแล้ว",
  "admin.apps.deleteConfirm": "ลบ “{app}” ออกจาก Launcher?",
  "admin.apps.deleted": "ลบแอปแล้ว",
  "admin.apps.delete": "ลบ {app}",
  "admin.apps.loadFailed": "โหลดรายการแอปไม่สำเร็จ",

  // admin: AI translation settings
  "ai.title": "AI สำหรับแปลภาษา",
  "ai.body":
    "ใช้แปลชื่อแอป คำอธิบาย และข้อความแบรนด์จากไทยเป็นอังกฤษด้วยปุ่ม “แปลด้วย AI” — API key เก็บฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ถูกส่งกลับมาที่เบราว์เซอร์",
  "ai.provider": "AI Provider",
  "ai.model": "โมเดล",
  "ai.modelPlaceholder": "เลือกโมเดล",
  "ai.modelHint": "รายการโมเดลดึงจาก provider โดยตรง ต้องมี API key ก่อนจึงจะดึงได้",
  "ai.loadModels": "ดึงรายการโมเดล",
  "ai.loadingModels": "กำลังดึงรายการโมเดล…",
  "ai.modelsLoaded": "พบ {count} โมเดล",
  "ai.modelsFailed": "ดึงรายการโมเดลไม่สำเร็จ",
  "ai.apiKey": "API key",
  "ai.apiKeySaved": "บันทึกแล้ว (ลงท้ายด้วย …{hint}) — กรอกใหม่ถ้าต้องการเปลี่ยน",
  "ai.apiKeyNotSet": "ยังไม่ได้ตั้งค่า",
  "ai.apiKeyPlaceholder": "วาง API key ของ provider ที่เลือก",
  "ai.apiKeyNeeded": "ต้องใส่ API key ก่อน",
  "ai.saved": "บันทึกการตั้งค่า AI แล้ว",
  "ai.saveNeedsModel": "เลือกโมเดลก่อนบันทึก",
  "ai.status.ready": "พร้อมใช้งาน",
  "ai.status.missing": "ยังไม่ครบ",
  "ai.status.hint": "ต้องมีทั้ง provider, โมเดล และ API key",
} as const;

export type StringKey = keyof typeof th;

const en: Record<StringKey, string> = {
  "common.back": "Back to home",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "common.retry": "Try again",
  "common.or": "or",
  "common.unknownError": "Unknown error",
  "common.saveFailed": "Could not save",
  "common.deleteFailed": "Could not delete",
  "common.language": "Language",
  "common.logoAlt": "{brand} logo",
  "common.signOut": "Sign out",
  "common.signedOut": "Signed out",

  "root.notFound.title": "Page not found",
  "root.notFound.body": "The page you opened may have moved or no longer exists.",
  "root.error.title": "This page could not be loaded",
  "root.error.body": "Something went wrong. Refresh the page or go back to home.",

  "launcher.social.heading": "Your apps",
  "launcher.social.subheading": "Sign in once, use every app",
  "launcher.business.heading": "Business apps",
  "launcher.business.subheading": "Opens the app; sign in there",
  "launcher.signingIn": "Signing in…",
  "launcher.needsSetup.title": "LINE Login is not set up yet",
  "launcher.needsSetup.body":
    "Add the LINE Channel ID, Channel Secret and LIFF ID first to enable sign-in through LINE.",
  "launcher.signIn.title": "Sign in to get started",
  "launcher.signIn.body":
    "Open this page from LINE to sign in automatically, or sign in with email or Google.",
  "launcher.signIn.button": "Sign in with email or Google",
  "launcher.hello": "Hello",
  "launcher.you": "there",
  "launcher.profileAlt": "Profile picture",
  "launcher.manage": "Manage Launcher",
  "launcher.settings": "Settings",
  "launcher.loadFailed": "Could not load the app list",
  "launcher.empty": "No apps in this group yet — an admin can add them in Manage Launcher.",
  "launcher.toBusiness": "Go to business apps",
  "launcher.toSocial": "Go to your apps (Social)",
  "launcher.noSso": "{app} has no SSO configured — opening normally instead",
  "launcher.openFailed": "Could not open the app",

  "line.noIdToken": "No ID token was returned by LINE",
  "line.failed": "Sign-in with LINE failed",

  "auth.displayName": "Display name",
  "auth.displayNamePlaceholder": "Your name",
  "auth.defaultName": "User",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign in",
  "auth.signUp": "Create account",
  "auth.google": "Sign in with Google",
  "auth.toSignUp": "No account yet? Create one",
  "auth.toSignIn": "Already have an account? Sign in",
  "auth.accountCreated": "Account created",
  "auth.err.invalidCredential": "Incorrect email or password",
  "auth.err.emailInUse": "This email already has an account — sign in instead",
  "auth.err.weakPassword": "Password is too short; use at least 6 characters",
  "auth.err.tooMany": "Too many attempts. Wait a moment and try again",
  "auth.err.network": "Network connection failed",
  "auth.err.generic": "The request failed",

  "sso.forwardFailed": "Could not hand off the sign-in",
  "sso.failedTitle": "Hand-off failed",
  "sso.forwarding": "Taking you to the app…",

  "settings.title": "Settings",
  "settings.lineStatus": "LINE Login status",
  "settings.lineChannel": "LINE Channel / LIFF",
  "settings.ready": "Ready",
  "settings.notConfigured": "Not configured",
  "settings.lineHelp":
    "Set LINE_CHANNEL_ID, LINE_CHANNEL_SECRET and LINE_LIFF_ID as environment variables on Netlify to enable automatic sign-in from LINE — see how to create all three in the",
  "settings.lineGuide": "LINE Developers setup guide",
  "settings.apps.title": "Apps connected to Aivora Launcher",
  "settings.apps.body": "Choose which apps appear on your Launcher (this setting is yours alone).",
  "settings.apps.showIn": "Show {app} in Launcher",
  "settings.apps.allowList": "Allow-list:",
  "settings.apps.noAllowList": "Not set (opens without SSO)",
  "settings.manage": "Manage Launcher (admin)",
  "settings.lineGuideButton": "LINE setup guide",
  "settings.ssoGuideButton": "SSO integration guide",

  "admin.onlyAdmin": "Admins only",
  "admin.onlyAdminBody":
    "This account does not have the admin role, so it cannot open this page — add this email to ADMIN_EMAILS and sign in again.",
  "admin.title": "Manage Launcher",
  "admin.social": "Social apps (with SSO)",
  "admin.business": "Business apps (no SSO)",
  "admin.brand.title": "Brand & logo",
  "admin.brand.changeLogo": "Change logo",
  "admin.brand.logoHint": "PNG, SVG or WebP; a square image works best",
  "admin.brand.name": "Brand name",
  "admin.brand.tagline": "Tagline",
  "admin.brand.saved": "Brand name saved",
  "admin.brand.logoChanged": "Logo changed",
  "admin.brand.uploadFailed": "Logo upload failed",
  "admin.th": "Thai",
  "admin.en": "English",
  "admin.enHint": "Leave blank to fall back to the Thai text when a user picks English.",
  "admin.translate": "Translate with AI",
  "admin.translating": "Translating…",
  "admin.translated": "Translated — review before saving",
  "admin.translateFailed": "Translation failed",
  "admin.translateNeedsSource": "Enter the Thai text first",
  "admin.translateNotConfigured":
    "AI translation is not configured yet — set it up under “AI translation” below.",
  "admin.apps.add": "Add app",
  "admin.apps.name": "App name",
  "admin.apps.slug": "slug",
  "admin.apps.url": "App URL",
  "admin.apps.description": "Description",
  "admin.apps.prefixes": "SSO redirect allow-list (one per line)",
  "admin.apps.businessNote":
    "Business apps open directly without SSO; users sign in at the app itself.",
  "admin.apps.icon": "Icon (lucide)",
  "admin.apps.iconHint": "Use a name from lucide.dev/icons, e.g. sparkles, calendar, wallet",
  "admin.apps.iconUnknown": "Unknown icon “{icon}” — layout-grid will be shown instead",
  "admin.apps.order": "Order",
  "admin.apps.active": "Enabled in Launcher",
  "admin.apps.inactive": "(disabled)",
  "admin.apps.required": "slug, name and URL are required",
  "admin.apps.saved": "App saved",
  "admin.apps.deleteConfirm": "Remove “{app}” from the Launcher?",
  "admin.apps.deleted": "App removed",
  "admin.apps.delete": "Remove {app}",
  "admin.apps.loadFailed": "Could not load the app list",

  "ai.title": "AI translation",
  "ai.body":
    "Translates app names, descriptions and brand text from Thai to English via the “Translate with AI” buttons. The API key stays on the server and is never sent back to the browser.",
  "ai.provider": "AI provider",
  "ai.model": "Model",
  "ai.modelPlaceholder": "Choose a model",
  "ai.modelHint":
    "The model list comes straight from the provider; an API key is needed to fetch it.",
  "ai.loadModels": "Fetch models",
  "ai.loadingModels": "Fetching models…",
  "ai.modelsLoaded": "{count} models found",
  "ai.modelsFailed": "Could not fetch the model list",
  "ai.apiKey": "API key",
  "ai.apiKeySaved": "Saved (ends in …{hint}) — enter a new key to replace it",
  "ai.apiKeyNotSet": "Not set",
  "ai.apiKeyPlaceholder": "Paste the API key for the selected provider",
  "ai.apiKeyNeeded": "An API key is required first",
  "ai.saved": "AI settings saved",
  "ai.saveNeedsModel": "Choose a model before saving",
  "ai.status.ready": "Ready",
  "ai.status.missing": "Incomplete",
  "ai.status.hint": "Needs a provider, a model and an API key",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { th, en };

export type Params = Record<string, string | number>;

export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function translate(lang: Lang, key: StringKey, params?: Params): string {
  return format(STRINGS[lang][key] ?? STRINGS.th[key], params);
}

/**
 * Pick the admin-entered text for the current language. English is optional
 * on every document, so an empty English field falls back to the Thai one
 * rather than rendering blank.
 */
export function localized(lang: Lang, thText: string, enText: string | null | undefined): string {
  if (lang === "en" && enText && enText.trim()) return enText;
  return thText;
}

export function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "th" || stored === "en") return stored;
  } catch {
    // localStorage can throw in private mode; fall through to the default.
  }
  return "th";
}

export interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, params?: Params) => string;
}

export const LangContext = createContext<LangContextValue>({
  lang: "th",
  setLang: () => undefined,
  t: (key, params) => translate("th", key, params),
});

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
