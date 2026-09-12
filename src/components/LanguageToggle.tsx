import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LANG_STORAGE_KEY,
  LangContext,
  readStoredLang,
  translate,
  type Lang,
  type Params,
  type StringKey,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Holds the current UI language for the whole app. The choice is per browser
 * (localStorage), not per account — a shared phone in a shop should not flip
 * language every time someone else signs in.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  // Always render Thai on the first pass so the server and the client agree;
  // the stored preference is applied right after mount.
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    setLangState(readStoredLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Not fatal — the language still applies for this page view.
    }
  }, []);

  // Stable per language, so `t` is safe to list in effect dependencies
  // without re-running the effect on every render.
  const t = useCallback((key: StringKey, params?: Params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

const OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "EN" },
];

/** Compact TH / EN switch used in page headers. */
export function LanguageToggle({
  lang,
  onChange,
  className,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/70 p-0.5 text-xs",
        className,
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={lang === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            lang === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
