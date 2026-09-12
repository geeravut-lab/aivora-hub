/**
 * Server-only: admin-side Thai → English translation through the provider the
 * admin picked (Gemini, OpenAI or Anthropic).
 *
 * Plain REST for all three, no provider SDKs — the same reasoning as the
 * Firebase helpers: three tiny calls (list models, one completion) do not
 * justify three SDKs in the serverless bundle, and one shape for all of them
 * keeps the adapters comparable.
 *
 * The API key lives in `private/aiTranslation`, which the security rules deny
 * to every client; only this module reads it, via the service account. The
 * browser sees `settings/aiTranslation`, which carries the provider, model and
 * a four-character hint of the key — enough to recognise it, not to use it.
 */
import { getDoc, setDoc } from "@/integrations/firebase/admin.server";
import {
  AI_PROVIDERS,
  AI_TRANSLATION_DOC_ID,
  COLLECTIONS,
  type AiProvider,
  type AiTranslationSettingsDoc,
} from "@/integrations/firebase/schema";

const PUBLIC_PATH = `${COLLECTIONS.settings}/${AI_TRANSLATION_DOC_ID}`;
const PRIVATE_PATH = `${COLLECTIONS.private}/${AI_TRANSLATION_DOC_ID}`;

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);
}

export async function readPublicSettings(): Promise<AiTranslationSettingsDoc> {
  const snap = await getDoc(PUBLIC_PATH);
  const data = snap.data;
  return {
    provider: isAiProvider(data["provider"]) ? data["provider"] : null,
    model: typeof data["model"] === "string" && data["model"] ? data["model"] : null,
    hasApiKey: data["hasApiKey"] === true,
    apiKeyHint: typeof data["apiKeyHint"] === "string" ? data["apiKeyHint"] : null,
  };
}

async function readStoredKey(): Promise<string | null> {
  const snap = await getDoc(PRIVATE_PATH);
  const key = snap.data["apiKey"];
  return typeof key === "string" && key ? key : null;
}

export async function saveSettings(input: {
  provider: AiProvider;
  model: string;
  apiKey: string | null;
}): Promise<AiTranslationSettingsDoc> {
  const current = await readPublicSettings();
  let hint = current.apiKeyHint;
  let hasKey = current.hasApiKey;

  // A new key replaces the old one; an empty field means "keep what is there".
  if (input.apiKey) {
    await setDoc(PRIVATE_PATH, { apiKey: input.apiKey, updatedAt: new Date() }, { merge: true });
    hint = input.apiKey.slice(-4);
    hasKey = true;
  }

  const next: AiTranslationSettingsDoc = {
    provider: input.provider,
    model: input.model,
    hasApiKey: hasKey,
    apiKeyHint: hint,
  };
  await setDoc(PUBLIC_PATH, { ...next, updatedAt: new Date() }, { merge: true });
  return next;
}

/* ---------- provider adapters ---------- */

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI = "https://api.openai.com/v1";
const ANTHROPIC = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

async function callJson<T>(url: string, init: RequestInit, who: string): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      (typeof body === "string" ? body.slice(0, 200) : res.statusText);
    throw new Error(`${who}: ${res.status} ${detail}`);
  }
  return body as T;
}

/**
 * The model list an admin picks from. Filtered down to what can actually take
 * a text prompt — OpenAI's `/models` in particular lists embeddings, audio and
 * image models under the same endpoint.
 */
export async function listModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  switch (provider) {
    case "gemini": {
      const out: string[] = [];
      let pageToken: string | undefined;
      do {
        const url = new URL(`${GEMINI}/models`);
        url.searchParams.set("key", apiKey);
        url.searchParams.set("pageSize", "100");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const page = await callJson<{
          models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
          nextPageToken?: string;
        }>(url.toString(), { method: "GET" }, "Gemini");
        for (const m of page.models ?? []) {
          if (m.supportedGenerationMethods?.includes("generateContent")) {
            out.push(m.name.replace(/^models\//, ""));
          }
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
      return out.sort();
    }
    case "openai": {
      const page = await callJson<{ data?: Array<{ id: string }> }>(
        `${OPENAI}/models`,
        { method: "GET", headers: { authorization: `Bearer ${apiKey}` } },
        "OpenAI",
      );
      const excluded =
        /embedding|whisper|tts|audio|realtime|transcribe|dall-e|image|moderation|davinci|babbage|search|similarity|edit|instruct|computer-use|codex/i;
      return (page.data ?? [])
        .map((m) => m.id)
        .filter((id) => /^(gpt-|o\d)/.test(id) && !excluded.test(id))
        .sort();
    }
    case "anthropic": {
      const out: string[] = [];
      let afterId: string | undefined;
      do {
        const url = new URL(`${ANTHROPIC}/models`);
        url.searchParams.set("limit", "100");
        if (afterId) url.searchParams.set("after_id", afterId);
        const page = await callJson<{
          data?: Array<{ id: string }>;
          has_more?: boolean;
          last_id?: string | null;
        }>(
          url.toString(),
          {
            method: "GET",
            headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
          },
          "Anthropic",
        );
        for (const m of page.data ?? []) out.push(m.id);
        afterId = page.has_more && page.last_id ? page.last_id : undefined;
      } while (afterId);
      return out.sort();
    }
  }
}

const SYSTEM_PROMPT =
  "You translate short UI copy for a Thai web app launcher from Thai into natural, concise English. " +
  "Reply with the translation only — no quotes, no explanation, no alternatives. " +
  "Keep product names, brand names and technical terms as they are. " +
  "Match the register of the source: a tagline stays a tagline, a one-line description stays one line.";

export async function translateThaiToEnglish(
  provider: AiProvider,
  model: string,
  apiKey: string,
  text: string,
): Promise<string> {
  const userPrompt = `Translate to English:\n\n${text}`;
  let raw: string;

  switch (provider) {
    case "gemini": {
      const url = `${GEMINI}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await callJson<{
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }>(
        url,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          }),
        },
        "Gemini",
      );
      raw = (res.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      break;
    }
    case "openai": {
      const res = await callJson<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>(
        `${OPENAI}/chat/completions`,
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          }),
        },
        "OpenAI",
      );
      raw = res.choices?.[0]?.message?.content ?? "";
      break;
    }
    case "anthropic": {
      // Kept to the fields every Claude generation accepts, since the model is
      // whatever the admin picked from the live list.
      const res = await callJson<{
        content?: Array<{ type: string; text?: string }>;
      }>(
        `${ANTHROPIC}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model,
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          }),
        },
        "Anthropic",
      );
      raw = (res.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");
      break;
    }
  }

  const cleaned = raw.trim().replace(/^["“”']+|["“”']+$/g, "");
  if (!cleaned) throw new Error("ผู้ให้บริการ AI ตอบกลับมาว่างเปล่า");
  return cleaned;
}

/** Resolve the stored configuration into something that can translate now. */
export async function resolveTranslator(): Promise<{
  provider: AiProvider;
  model: string;
  apiKey: string;
} | null> {
  const settings = await readPublicSettings();
  if (!settings.provider || !settings.model) return null;
  const apiKey = await readStoredKey();
  if (!apiKey) return null;
  return { provider: settings.provider, model: settings.model, apiKey };
}

export { readStoredKey };
