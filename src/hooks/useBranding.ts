import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { BRANDING_DOC_ID, COLLECTIONS, type BrandingDoc } from "@/integrations/firebase/schema";
import { localized, useLang } from "@/lib/i18n";
import fallbackLogo from "@/assets/aivora-logo.svg";

export const DEFAULT_BRANDING = {
  brand_name: "Aivora",
  brand_name_en: null as string | null,
  tagline: "ล็อกอินครั้งเดียว เข้าได้ทุกแอปในระบบ",
  tagline_en: "Sign in once, use every app" as string | null,
  logoSrc: fallbackLogo,
};

export type Branding = typeof DEFAULT_BRANDING;

/**
 * Branding is admin-editable at runtime (name, tagline, logo).
 * The logo's download URL is stored on the doc at upload time, so reading it
 * costs one document read instead of a signed-URL round trip per page load.
 *
 * Returns both the raw per-language fields (for the admin form) and a
 * `display` view already resolved for the current UI language.
 */
export function useBranding() {
  const { lang } = useLang();
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: async (): Promise<Branding> => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.branding, BRANDING_DOC_ID));
        if (!snap.exists()) return DEFAULT_BRANDING;
        const data = snap.data() as Partial<BrandingDoc>;
        return {
          brand_name: data.brandName || DEFAULT_BRANDING.brand_name,
          brand_name_en: data.brandNameEn || null,
          tagline: data.tagline || DEFAULT_BRANDING.tagline,
          tagline_en: data.taglineEn || DEFAULT_BRANDING.tagline_en,
          logoSrc: data.logoUrl || DEFAULT_BRANDING.logoSrc,
        };
      } catch (error) {
        // The fallback below is indistinguishable from "branding not seeded
        // yet", so leave the real reason somewhere a reader can find it.
        console.error("[branding] อ่าน branding ไม่สำเร็จ — ใช้ค่าเริ่มต้นแทน", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const branding = query.data ?? DEFAULT_BRANDING;
  const display = {
    brand_name: localized(lang, branding.brand_name, branding.brand_name_en),
    tagline: localized(lang, branding.tagline, branding.tagline_en),
    logoSrc: branding.logoSrc,
  };

  return { branding, display, isLoading: query.isLoading };
}
