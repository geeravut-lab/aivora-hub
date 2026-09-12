import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, LogOut, Settings2, Shield, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import type { AppCategory } from "@/integrations/firebase/schema";
import { getProfile, listVisibleApps, type AppRecord } from "@/lib/hub-data";
import { localized, useLang } from "@/lib/i18n";
import { useBranding } from "@/hooks/useBranding";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLineLogin } from "@/hooks/useLineLogin";
import { issueSsoTicket } from "@/lib/sso.functions";
import { ensureLiff } from "@/lib/liff";
import { isLineInAppBrowser, openInDefaultBrowser } from "@/lib/open-external";
import { AppIcon } from "@/components/AppIcon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type { AppCategory };

export function AppLauncher({
  category,
  sso,
  settingsPath,
}: {
  category: AppCategory;
  /** Social apps hand off an SSO ticket; business apps just open and log in themselves. */
  sso: boolean;
  settingsPath: "/settings";
}) {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const { status, message, user, loading } = useLineLogin();
  const { display: branding } = useBranding();
  const { isAdmin } = useIsAdmin(user);
  const issueTicket = useServerFn(issueSsoTicket);
  const [pending, setPending] = useState<string | null>(null);
  const [liffReady, setLiffReady] = useState(() => !isLineInAppBrowser());

  const heading =
    category === "social" ? t("launcher.social.heading") : t("launcher.business.heading");
  const subheading =
    category === "social" ? t("launcher.social.subheading") : t("launcher.business.subheading");

  useEffect(() => {
    if (!isLineInAppBrowser()) return;
    let cancelled = false;
    void ensureLiff().finally(() => {
      if (!cancelled) setLiffReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const appsQuery = useQuery({
    queryKey: ["apps", category, user?.uid],
    enabled: Boolean(user),
    queryFn: () => listVisibleApps(user!.uid, category),
    // A permission or config error is permanent — retrying three times only
    // holds the skeleton on screen and hides the reason.
    retry: 1,
  });

  const profileQuery = useQuery({
    queryKey: ["profile", user?.uid],
    enabled: Boolean(user),
    queryFn: () => getProfile(user!.uid),
  });

  async function handleOpen(app: AppRecord) {
    const appName = localized(lang, app.name, app.nameEn);
    if (app.url.startsWith("/")) {
      navigate({ to: app.url });
      return;
    }
    const prefixes = app.allowedRedirectPrefixes ?? [];
    if (!sso || prefixes.length === 0) {
      await openInDefaultBrowser(app.url);
      if (sso) toast.info(t("launcher.noSso", { app: appName }));
      return;
    }
    setPending(app.slug);
    try {
      const redirectUri = prefixes[0];
      if (!redirectUri) return;
      const { redirectTo } = await issueTicket({
        data: { appSlug: app.slug, redirectUri },
      });
      await openInDefaultBrowser(redirectTo);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("launcher.openFailed"));
    } finally {
      setPending(null);
    }
  }

  const languageToggle = <LanguageToggle lang={lang} onChange={setLang} />;

  if (loading || (!user && status === "working")) {
    return (
      <FullScreenNotice
        icon={<Loader2 className="size-6 animate-spin" />}
        title={t("launcher.signingIn")}
        toolbar={languageToggle}
      />
    );
  }

  if (!user) {
    return (
      <FullScreenNotice
        icon={<ShieldCheck className="size-6 text-primary" />}
        title={
          status === "needs-setup" ? t("launcher.needsSetup.title") : t("launcher.signIn.title")
        }
        description={
          status === "needs-setup"
            ? t("launcher.needsSetup.body")
            : (message ?? t("launcher.signIn.body"))
        }
        action={
          <Button onClick={() => navigate({ to: "/auth" })} className="rounded-full px-6">
            {t("launcher.signIn.button")}
          </Button>
        }
        toolbar={languageToggle}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName ?? t("launcher.profileAlt")}
              className="size-12 rounded-2xl border border-border object-cover"
            />
          ) : (
            <img
              src={branding.logoSrc}
              alt={t("common.logoAlt", { brand: branding.brand_name })}
              className="size-12 rounded-2xl border border-border bg-card object-contain p-1"
            />
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {branding.brand_name}
            </p>
            <h1 className="text-lg font-semibold">
              {t("launcher.hello")}{" "}
              {profile?.displayName ??
                user.displayName ??
                user.email?.split("@")[0] ??
                t("launcher.you")}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {languageToggle}
          {isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/admin" })}
              aria-label={t("launcher.manage")}
            >
              <Shield className="size-5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: settingsPath })}
            aria-label={t("launcher.settings")}
          >
            <Settings2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.signOut")}
            onClick={async () => {
              await signOut(auth);
              toast.success(t("common.signedOut"));
            }}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">{heading}</h2>
          <p className="text-xs text-muted-foreground">{subheading}</p>
        </div>

        {appsQuery.isLoading ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))}
          </div>
        ) : appsQuery.isError ? (
          // Say what actually broke. Silently falling back to "no apps here"
          // makes a rules or config failure look like an empty launcher.
          <div className="mt-5 rounded-3xl border border-destructive/40 bg-destructive/5 p-6">
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
        ) : (appsQuery.data ?? []).length === 0 ? (
          <p className="mt-5 rounded-3xl border border-border bg-card/70 p-6 text-sm text-muted-foreground">
            {t("launcher.empty")}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(appsQuery.data ?? []).map((app) => (
              <button
                key={app.id}
                onClick={() => handleOpen(app)}
                disabled={!liffReady || pending === app.slug}
                className="group relative flex flex-col items-start gap-2 rounded-3xl border border-border bg-card/70 p-5 text-left transition-colors hover:border-primary/50 hover:bg-card disabled:opacity-60"
              >
                <div className="flex w-full items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <AppIcon name={app.icon} className="size-5" />
                  </span>
                  {!liffReady || pending === app.slug ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  )}
                </div>
                <span className="font-semibold">{localized(lang, app.name, app.nameEn)}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {localized(lang, app.description ?? "", app.descriptionEn)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={() => navigate({ to: category === "social" ? "/business" : "/" })}
          >
            {category === "social" ? t("launcher.toBusiness") : t("launcher.toSocial")}
            <ArrowUpRight className="ml-1 size-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}

function FullScreenNotice({
  icon,
  title,
  description,
  action,
  toolbar,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      {toolbar ? <div className="absolute right-5 top-5">{toolbar}</div> : null}
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/70 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15">
          {icon}
        </div>
        <h1 className="mt-5 text-xl font-semibold">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </main>
  );
}
