import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/integrations/firebase/client";
import { listApps, listHiddenAppIds, setAppHidden } from "@/lib/hub-data";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getLineLauncherConfig } from "@/lib/line-auth.functions";
import { localized, useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ตั้งค่าระบบ SSO — Aivora" },
      {
        name: "description",
        content: "ตรวจสอบสถานะ LINE Login และรายการแอปที่เชื่อมต่อ single sign-on",
      },
      { property: "og:title", content: "ตั้งค่าระบบ SSO — Aivora" },
      {
        property: "og:description",
        content: "ตรวจสอบสถานะ LINE Login และรายการแอปที่เชื่อมต่อ single sign-on",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin(user);
  const { lang, setLang, t } = useLang();
  const getConfig = useServerFn(getLineLauncherConfig);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/settings" } });
  }, [loading, user, navigate]);

  const configQuery = useQuery({
    queryKey: ["line-config"],
    enabled: isAdmin,
    queryFn: () => getConfig(),
  });

  const appsQuery = useQuery({
    queryKey: ["apps-settings", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => {
      const [apps, hidden] = await Promise.all([listApps(), listHiddenAppIds(user!.uid)]);
      return apps.map((app) => ({ ...app, enabled: !hidden.has(app.id) }));
    },
    // A rules or config failure is permanent — retrying three times only
    // delays the message and leaves the list looking empty in the meantime.
    retry: 1,
  });

  const toggleApp = useMutation({
    mutationFn: ({ appId, enabled }: { appId: string; enabled: boolean }) =>
      setAppHidden(user!.uid, appId, !enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["apps-settings", user?.uid] });
      void queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("common.saveFailed")),
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-16 pt-8">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("common.back")}
        </button>
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>

      <h1 className="mt-6 text-2xl font-semibold">{t("settings.title")}</h1>

      {isAdmin ? (
        <section className="mt-6 rounded-3xl border border-border bg-card/70 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-semibold">{t("settings.lineStatus")}</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("settings.lineChannel")}</span>
              <Badge variant={configQuery.data?.configured ? "default" : "secondary"}>
                {configQuery.data?.configured ? t("settings.ready") : t("settings.notConfigured")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">LIFF ID</span>
              <span className="font-mono text-xs">{configQuery.data?.liffId ?? "—"}</span>
            </div>
          </div>
          {configQuery.data && !configQuery.data.configured ? (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4 text-xs leading-relaxed text-muted-foreground">
              {t("settings.lineHelp")}
              <button
                onClick={() => navigate({ to: "/line-setup" })}
                className="mx-1 text-primary hover:underline"
              >
                {t("settings.lineGuide")}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">{t("settings.apps.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.apps.body")}</p>
        {appsQuery.isError ? (
          // Without this branch an unreadable collection renders as an empty
          // list, which is indistinguishable from "no apps configured yet".
          <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium">{t("launcher.loadFailed")}</p>
            <p className="mt-2 break-words text-xs text-muted-foreground">
              {appsQuery.error instanceof Error
                ? appsQuery.error.message
                : t("common.unknownError")}
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

        <ul className="mt-4 space-y-3">
          {(appsQuery.data ?? []).map((app) => (
            <li key={app.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{localized(lang, app.name, app.nameEn)}</span>
                <Switch
                  checked={app.enabled}
                  disabled={toggleApp.isPending}
                  aria-label={t("settings.apps.showIn", {
                    app: localized(lang, app.name, app.nameEn),
                  })}
                  onCheckedChange={(next) => toggleApp.mutate({ appId: app.id, enabled: next })}
                />
              </div>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{app.url}</p>
              {isAdmin ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("settings.apps.allowList")}{" "}
                  {app.allowedRedirectPrefixes.length > 0
                    ? app.allowedRedirectPrefixes.join(", ")
                    : t("settings.apps.noAllowList")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {isAdmin ? (
          <>
            <Button className="rounded-full" onClick={() => navigate({ to: "/admin" })}>
              {t("settings.manage")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate({ to: "/line-setup" })}
            >
              {t("settings.lineGuideButton")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate({ to: "/docs" })}
            >
              {t("settings.ssoGuideButton")}
            </Button>
          </>
        ) : null}

        <Button
          variant="outline"
          className="rounded-full"
          onClick={async () => {
            await signOut(auth);
            navigate({ to: "/auth" });
          }}
        >
          {t("common.signOut")}
        </Button>
      </div>
    </main>
  );
}
