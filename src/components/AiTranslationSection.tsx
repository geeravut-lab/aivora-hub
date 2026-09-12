import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { AI_PROVIDERS, type AiProvider } from "@/integrations/firebase/schema";
import {
  getAiTranslationSettings,
  listAiModels,
  saveAiTranslationSettings,
} from "@/lib/ai-translate.functions";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Gemini (Google)",
  openai: "ChatGPT (OpenAI)",
  anthropic: "Claude (Anthropic)",
};

/**
 * Admin card for the translation provider. The key is write-only from here:
 * it goes up once, the server stores it out of the browser's reach, and all
 * that comes back is a four-character hint so the admin knows which key is in.
 */
export function AiTranslationSection() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const getSettings = useServerFn(getAiTranslationSettings);
  const fetchModels = useServerFn(listAiModels);
  const saveSettings = useServerFn(saveAiTranslationSettings);

  const settingsQuery = useQuery({
    queryKey: ["ai-translation-settings"],
    queryFn: () => getSettings(),
    retry: 1,
  });

  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form from what is stored, once it arrives.
  useEffect(() => {
    if (!settingsQuery.data) return;
    setProvider(settingsQuery.data.provider);
    setModel(settingsQuery.data.model ?? "");
  }, [settingsQuery.data]);

  const stored = settingsQuery.data;
  const keyAvailable = Boolean(apiKey.trim()) || Boolean(stored?.hasApiKey);

  async function loadModels(forProvider: AiProvider | null = provider) {
    if (!forProvider) return;
    if (!keyAvailable) {
      toast.error(t("ai.apiKeyNeeded"));
      return;
    }
    setLoadingModels(true);
    try {
      const typed = apiKey.trim();
      const { models: list } = await fetchModels({
        data: { provider: forProvider, ...(typed ? { apiKey: typed } : {}) },
      });
      setModels(list);
      toast.success(t("ai.modelsLoaded", { count: list.length }));
    } catch (error) {
      toast.error(
        error instanceof Error ? `${t("ai.modelsFailed")}: ${error.message}` : t("ai.modelsFailed"),
      );
    } finally {
      setLoadingModels(false);
    }
  }

  function changeProvider(next: AiProvider) {
    setProvider(next);
    setModels([]);
    // The stored model belongs to the stored provider; anything else starts blank.
    setModel(stored?.provider === next ? (stored.model ?? "") : "");
  }

  async function save() {
    if (!provider) return;
    if (!model.trim()) {
      toast.error(t("ai.saveNeedsModel"));
      return;
    }
    if (!keyAvailable) {
      toast.error(t("ai.apiKeyNeeded"));
      return;
    }
    setSaving(true);
    try {
      const typed = apiKey.trim();
      await saveSettings({
        data: { provider, model: model.trim(), ...(typed ? { apiKey: typed } : {}) },
      });
      setApiKey("");
      await queryClient.invalidateQueries({ queryKey: ["ai-translation-settings"] });
      toast.success(t("ai.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const ready = Boolean(stored?.provider && stored?.model && stored?.hasApiKey);
  // Keep the stored model selectable even before the list has been fetched.
  const options = model && !models.includes(model) ? [model, ...models] : models;

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="font-semibold">{t("ai.title")}</h2>
        </div>
        <Badge variant={ready ? "default" : "secondary"} title={t("ai.status.hint")}>
          {ready ? t("ai.status.ready") : t("ai.status.missing")}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("ai.body")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("ai.provider")}</Label>
          <Select
            {...(provider ? { value: provider } : {})}
            onValueChange={(v) => changeProvider(v as AiProvider)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("ai.model")}</Label>
          <div className="flex gap-2">
            <Select
              {...(model ? { value: model } : {})}
              onValueChange={setModel}
              disabled={!provider}
            >
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder={t("ai.modelPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full"
              aria-label={t("ai.loadModels")}
              title={t("ai.loadModels")}
              disabled={!provider || loadingModels}
              onClick={() => void loadModels()}
            >
              {loadingModels ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("ai.modelHint")}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="ai-api-key">{t("ai.apiKey")}</Label>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id="ai-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("ai.apiKeyPlaceholder")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {stored?.hasApiKey
            ? t("ai.apiKeySaved", { hint: stored.apiKeyHint ?? "????" })
            : t("ai.apiKeyNotSet")}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={save} disabled={saving || !provider}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
          {t("common.save")}
        </Button>
      </div>
    </section>
  );
}
