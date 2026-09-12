import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";
import type { AiProvider, AiTranslationSettingsDoc } from "@/integrations/firebase/schema";

/**
 * Admin-only server functions behind the "Translate with AI" buttons and the
 * AI settings card. Everything that touches the provider key is loaded with
 * `await import()` inside the handler — this file ships to the client bundle.
 */

function assertAdmin(context: { isAdmin: boolean }) {
  if (!context.isAdmin) throw new Error("เฉพาะผู้ดูแลระบบเท่านั้น");
}

export const getAiTranslationSettings = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }): Promise<AiTranslationSettingsDoc> => {
    assertAdmin(context);
    const { readPublicSettings } = await import("./ai-translate.server");
    return readPublicSettings();
  });

/**
 * Model list for the picker. The key may come in with the request (the admin
 * just pasted it and has not saved yet) or fall back to the stored one.
 */
export const listAiModels = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { provider: string; apiKey?: string }) => {
    if (typeof input?.provider !== "string") throw new Error("provider ไม่ถูกต้อง");
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    if (apiKey.length > 512) throw new Error("API key ยาวผิดปกติ");
    return { provider: input.provider, apiKey: apiKey || null };
  })
  .handler(async ({ data, context }): Promise<{ models: string[] }> => {
    assertAdmin(context);
    const { isAiProvider, listModels, readStoredKey } = await import("./ai-translate.server");
    if (!isAiProvider(data.provider)) throw new Error("ไม่รู้จัก provider นี้");
    const apiKey = data.apiKey ?? (await readStoredKey());
    if (!apiKey) throw new Error("ต้องใส่ API key ก่อน");
    return { models: await listModels(data.provider, apiKey) };
  });

export const saveAiTranslationSettings = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { provider: string; model: string; apiKey?: string }) => {
    if (typeof input?.provider !== "string") throw new Error("provider ไม่ถูกต้อง");
    if (typeof input?.model !== "string" || !input.model.trim() || input.model.length > 200) {
      throw new Error("model ไม่ถูกต้อง");
    }
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    if (apiKey.length > 512) throw new Error("API key ยาวผิดปกติ");
    return { provider: input.provider, model: input.model.trim(), apiKey: apiKey || null };
  })
  .handler(async ({ data, context }): Promise<AiTranslationSettingsDoc> => {
    assertAdmin(context);
    const { isAiProvider, saveSettings } = await import("./ai-translate.server");
    if (!isAiProvider(data.provider)) throw new Error("ไม่รู้จัก provider นี้");
    const provider: AiProvider = data.provider;
    return saveSettings({ provider, model: data.model, apiKey: data.apiKey });
  });

export const translateToEnglish = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { text: string }) => {
    if (typeof input?.text !== "string" || !input.text.trim())
      throw new Error("ไม่มีข้อความให้แปล");
    if (input.text.length > 4000) throw new Error("ข้อความยาวเกิน 4000 ตัวอักษร");
    return { text: input.text.trim() };
  })
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    assertAdmin(context);
    const { resolveTranslator, translateThaiToEnglish } = await import("./ai-translate.server");
    const translator = await resolveTranslator();
    if (!translator) throw new Error("AI_NOT_CONFIGURED");
    const text = await translateThaiToEnglish(
      translator.provider,
      translator.model,
      translator.apiKey,
      data.text,
    );
    return { text };
  });
