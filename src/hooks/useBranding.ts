import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { BRANDING_DOC_ID, COLLECTIONS, type BrandingDoc } from "@/integrations/firebase/schema";
import fallbackLogo from "@/assets/aivora-logo.svg";

export const DEFAULT_BRANDING = {
  brand_name: "Aivora",
  tagline: "ล็อกอินครั้งเดียว เข้าได้ทุกแอปในระบบ",
  logoSrc: fallbackLogo,
};

export type Branding = typeof DEFAULT_BRANDING;

/**
 * Branding is admin-editable at runtime (name, tagline, logo).
 * The logo's download URL is stored on the doc at upload time, so reading it
 * costs one document read instead of a signed-URL round trip per page load.
 */
export function useBranding() {
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: async (): Promise<Branding> => {
      const snap = await getDoc(doc(db, COLLECTIONS.branding, BRANDING_DOC_ID));
      if (!snap.exists()) return DEFAULT_BRANDING;
      const data = snap.data() as Partial<BrandingDoc>;
      return {
        brand_name: data.brandName || DEFAULT_BRANDING.brand_name,
        tagline: data.tagline || DEFAULT_BRANDING.tagline,
        logoSrc: data.logoUrl || DEFAULT_BRANDING.logoSrc,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return { branding: query.data ?? DEFAULT_BRANDING, isLoading: query.isLoading };
}
