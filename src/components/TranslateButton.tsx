import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Languages, Loader2 } from "lucide-react";
import { translateToEnglish } from "@/lib/ai-translate.functions";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * "Translate with AI" next to an English field: sends the Thai text through
 * the provider the admin configured and hands the result back to the form.
 * The result lands in the field, not in Firestore — the admin still reviews
 * and saves.
 */
export function TranslateButton({
  source,
  onResult,
  disabled,
}: {
  source: string;
  onResult: (english: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const translate = useServerFn(translateToEnglish);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!source.trim()) {
      toast.error(t("admin.translateNeedsSource"));
      return;
    }
    setBusy(true);
    try {
      const { text } = await translate({ data: { text: source } });
      onResult(text);
      toast.success(t("admin.translated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("AI_NOT_CONFIGURED")) {
        toast.error(t("admin.translateNotConfigured"));
      } else {
        toast.error(
          message ? `${t("admin.translateFailed")}: ${message}` : t("admin.translateFailed"),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={run}
      disabled={disabled || busy}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
      {busy ? t("admin.translating") : t("admin.translate")}
    </Button>
  );
}
