import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImageUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { AppCategory, AppDoc } from "@/integrations/firebase/schema";
import {
  deleteApp,
  listApps,
  saveApp,
  saveBrandingText,
  uploadBrandingLogo,
  type AppRecord,
} from "@/lib/hub-data";
import { localized, useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useBranding } from "@/hooks/useBranding";
import { AiTranslationSection } from "@/components/AiTranslationSection";
import { AppIcon } from "@/components/AppIcon";
import { isLucideIconName } from "@/lib/lucide-icons";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TranslateButton } from "@/components/TranslateButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ผู้ดูแลระบบ — Aivora" },
      { name: "description", content: "จัดการโลโก้ ชื่อแบรนด์ และรายการเว็บแอปใน Aivora Launcher" },
      { property: "og:title", content: "ผู้ดูแลระบบ — Aivora" },
      {
        property: "og:description",
        content: "จัดการโลโก้ ชื่อแบรนด์ และรายการเว็บแอปใน Aivora Launcher",
      },
    ],
  }),
  component: AdminPage,
});

type Draft = Omit<AppRecord, "id" | "allowedRedirectPrefixes"> & {
  id: string | null;
  prefixes: string;
};

function emptyDraft(sortOrder: number, category: AppCategory): Draft {
  return {
    id: null,
    slug: "",
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    url: "",
    icon: "layout-grid",
    accent: "primary",
    category,
    sortOrder,
    isActive: true,
    prefixes: "",
  };
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang, setLang, t } = useLang();
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin(user);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/admin" } });
  }, [loading, user, navigate]);

  if (loading || roleLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <Skeleton className="h-40 rounded-3xl" />
      </main>
    );
  }

  if (user && !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-border bg-card/70 p-8 text-center">
          <h1 className="text-lg font-semibold">{t("admin.onlyAdmin")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.onlyAdminBody")}</p>
          <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/" })}>
            {t("common.back")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-20 pt-8">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("common.back")}
        </button>
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">{t("admin.title")}</h1>
      <BrandingSection
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ["branding"] })}
      />
      <AppsSection category="social" title={t("admin.social")} sso />
      <AppsSection category="business" title={t("admin.business")} sso={false} />
      <AiTranslationSection />
    </main>
  );
}

/** Thai field on top, English underneath with a translate button beside it. */
function BilingualField({
  id,
  label,
  th,
  en,
  onTh,
  onEn,
  multiline,
  placeholder,
}: {
  id: string;
  label: string;
  th: string;
  en: string;
  onTh: (value: string) => void;
  onEn: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const { t } = useLang();
  const Field = multiline ? Textarea : Input;
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-th`}>
        {label} <span className="text-xs text-muted-foreground">({t("admin.th")})</span>
      </Label>
      <Field
        id={`${id}-th`}
        rows={multiline ? 2 : undefined}
        value={th}
        onChange={(e) => onTh(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-en`}>
          {label} <span className="text-xs text-muted-foreground">({t("admin.en")})</span>
        </Label>
        <TranslateButton source={th} onResult={onEn} />
      </div>
      <Field
        id={`${id}-en`}
        rows={multiline ? 2 : undefined}
        value={en}
        onChange={(e) => onEn(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{t("admin.enHint")}</p>
    </div>
  );
}

function BrandingSection({ onSaved }: { onSaved: () => void }) {
  const { t } = useLang();
  const { branding, display } = useBranding();
  const [name, setName] = useState(branding.brand_name);
  const [nameEn, setNameEn] = useState(branding.brand_name_en ?? "");
  const [tagline, setTagline] = useState(branding.tagline);
  const [taglineEn, setTaglineEn] = useState(branding.tagline_en ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(branding.brand_name);
    setNameEn(branding.brand_name_en ?? "");
    setTagline(branding.tagline);
    setTaglineEn(branding.tagline_en ?? "");
  }, [branding.brand_name, branding.brand_name_en, branding.tagline, branding.tagline_en]);

  async function saveText() {
    setBusy(true);
    try {
      await saveBrandingText({
        brandName: name.trim(),
        brandNameEn: nameEn.trim() || null,
        tagline: tagline.trim(),
        taglineEn: taglineEn.trim() || null,
      });
      onSaved();
      toast.success(t("admin.brand.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    try {
      await uploadBrandingLogo(file);
      onSaved();
      toast.success(t("admin.brand.logoChanged"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.brand.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card/70 p-6">
      <h2 className="font-semibold">{t("admin.brand.title")}</h2>
      <div className="mt-5 flex items-center gap-4">
        <img
          src={display.logoSrc}
          alt={t("common.logoAlt", { brand: display.brand_name })}
          className="size-16 rounded-2xl border border-border object-contain p-1"
        />
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp className="size-4" /> {t("admin.brand.changeLogo")}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">{t("admin.brand.logoHint")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <BilingualField
          id="brand-name"
          label={t("admin.brand.name")}
          th={name}
          en={nameEn}
          onTh={setName}
          onEn={setNameEn}
        />
        <BilingualField
          id="brand-tagline"
          label={t("admin.brand.tagline")}
          th={tagline}
          en={taglineEn}
          onTh={setTagline}
          onEn={setTaglineEn}
        />
        <Button className="rounded-full" onClick={saveText} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
          {t("common.save")}
        </Button>
      </div>
    </section>
  );
}

function AppsSection({
  category,
  title,
  sso,
}: {
  category: AppCategory;
  title: string;
  sso: boolean;
}) {
  const { lang, t } = useLang();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const appsQuery = useQuery({
    queryKey: ["admin-apps"],
    queryFn: listApps,
    // A rules or config failure is permanent — retrying three times only
    // delays the message and leaves the list looking empty in the meantime.
    retry: 1,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-apps"] });
    void queryClient.invalidateQueries({ queryKey: ["apps"] });
    void queryClient.invalidateQueries({ queryKey: ["apps-settings"] });
  }

  async function save() {
    if (!draft) return;
    if (!draft.slug.trim() || !draft.name.trim() || !draft.url.trim()) {
      toast.error(t("admin.apps.required"));
      return;
    }
    setBusy(true);
    try {
      const icon = draft.icon.trim().toLowerCase() || "layout-grid";
      const payload: AppDoc = {
        slug: draft.slug.trim(),
        name: draft.name.trim(),
        nameEn: draft.nameEn?.trim() || null,
        description: draft.description?.trim() || null,
        descriptionEn: draft.descriptionEn?.trim() || null,
        url: draft.url.trim(),
        icon,
        accent: draft.accent.trim() || "primary",
        category: draft.category === "business" ? "business" : "social",
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
        allowedRedirectPrefixes: draft.prefixes
          .split(/[\n,]/)
          .map((p) => p.trim())
          .filter(Boolean),
      };
      await saveApp(draft.id, payload);
      setDraft(null);
      refresh();
      toast.success(t("admin.apps.saved"));
      if (!isLucideIconName(icon)) toast.warning(t("admin.apps.iconUnknown", { icon }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(app: AppRecord) {
    const appName = localized(lang, app.name, app.nameEn);
    if (!window.confirm(t("admin.apps.deleteConfirm", { app: appName }))) return;
    try {
      await deleteApp(app.id);
      refresh();
      toast.success(t("admin.apps.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.deleteFailed"));
    }
  }

  const apps = (appsQuery.data ?? []).filter((app) => app.category === category);
  const draftIcon = draft?.icon.trim().toLowerCase() ?? "";

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => setDraft(emptyDraft(apps.length * 10 + 10, category))}
        >
          <Plus className="size-4" /> {t("admin.apps.add")}
        </Button>
      </div>

      {draft ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-primary/40 p-4">
          <BilingualField
            id={`app-name-${category}`}
            label={t("admin.apps.name")}
            th={draft.name}
            en={draft.nameEn ?? ""}
            onTh={(v) => setDraft({ ...draft, name: v })}
            onEn={(v) => setDraft({ ...draft, nameEn: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`app-slug-${category}`}>{t("admin.apps.slug")}</Label>
              <Input
                id={`app-slug-${category}`}
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`app-url-${category}`}>{t("admin.apps.url")}</Label>
              <Input
                id={`app-url-${category}`}
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://example.netlify.app"
              />
            </div>
          </div>
          <BilingualField
            id={`app-desc-${category}`}
            label={t("admin.apps.description")}
            th={draft.description ?? ""}
            en={draft.descriptionEn ?? ""}
            onTh={(v) => setDraft({ ...draft, description: v })}
            onEn={(v) => setDraft({ ...draft, descriptionEn: v })}
            multiline
          />
          {sso ? (
            <div className="space-y-2">
              <Label htmlFor={`app-prefixes-${category}`}>{t("admin.apps.prefixes")}</Label>
              <Textarea
                id={`app-prefixes-${category}`}
                rows={2}
                value={draft.prefixes}
                onChange={(e) => setDraft({ ...draft, prefixes: e.target.value })}
                placeholder="https://example.netlify.app/sso/callback"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
              {t("admin.apps.businessNote")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`app-icon-${category}`}>{t("admin.apps.icon")}</Label>
              <div className="flex items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <AppIcon name={draftIcon} className="size-4" />
                </span>
                <Input
                  id={`app-icon-${category}`}
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  spellCheck={false}
                />
              </div>
              <p
                className={
                  draftIcon && !isLucideIconName(draftIcon)
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {draftIcon && !isLucideIconName(draftIcon)
                  ? t("admin.apps.iconUnknown", { icon: draftIcon })
                  : t("admin.apps.iconHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`app-order-${category}`}>{t("admin.apps.order")}</Label>
              <Input
                id={`app-order-${category}`}
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={`app-active-${category}`}
              checked={draft.isActive}
              onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
            />
            <Label htmlFor={`app-active-${category}`}>{t("admin.apps.active")}</Label>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              {t("common.save")}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {appsQuery.isError ? (
        // Without this branch an unreadable collection renders as an empty
        // list, which is indistinguishable from "no apps configured yet".
        <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium">{t("admin.apps.loadFailed")}</p>
          <p className="mt-2 break-words text-xs text-muted-foreground">
            {appsQuery.error instanceof Error ? appsQuery.error.message : t("common.unknownError")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={() => void appsQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {apps.map((app) => (
          <li key={app.id} className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <AppIcon name={app.icon} className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {localized(lang, app.name, app.nameEn)}{" "}
                    {!app.isActive ? (
                      <span className="text-xs text-muted-foreground">
                        {t("admin.apps.inactive")}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {app.url}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    setDraft({
                      ...app,
                      nameEn: app.nameEn ?? "",
                      description: app.description ?? "",
                      descriptionEn: app.descriptionEn ?? "",
                      prefixes: app.allowedRedirectPrefixes.join("\n"),
                    })
                  }
                >
                  {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("admin.apps.delete", {
                    app: localized(lang, app.name, app.nameEn),
                  })}
                  onClick={() => remove(app)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
