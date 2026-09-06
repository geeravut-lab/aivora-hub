import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Loader2,
  LogOut,
  Settings2,
  Sparkles,
  LayoutGrid,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import type { AppCategory } from "@/integrations/firebase/schema";
import { getProfile, listVisibleApps, type AppRecord } from "@/lib/hub-data";
import { useBranding } from "@/hooks/useBranding";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLineLogin } from "@/hooks/useLineLogin";
import { issueSsoTicket } from "@/lib/sso.functions";
import { ensureLiff } from "@/lib/liff";
import { isLineInAppBrowser, openInDefaultBrowser } from "@/lib/open-external";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type { AppCategory };

export function AppLauncher({
  category,
  sso,
  heading,
  subheading,
  settingsPath,
}: {
  category: AppCategory;
  /** Social apps hand off an SSO ticket; business apps just open and log in themselves. */
  sso: boolean;
  heading: string;
  subheading: string;
  settingsPath: "/settings";
}) {
  const navigate = useNavigate();
  const { status, message, user, loading } = useLineLogin();
  const { branding } = useBranding();
  const { isAdmin } = useIsAdmin(user);
  const issueTicket = useServerFn(issueSsoTicket);
  const [pending, setPending] = useState<string | null>(null);
  const [liffReady, setLiffReady] = useState(() => !isLineInAppBrowser());

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
  });

  const profileQuery = useQuery({
    queryKey: ["profile", user?.uid],
    enabled: Boolean(user),
    queryFn: () => getProfile(user!.uid),
  });

  async function handleOpen(app: AppRecord) {
    if (app.url.startsWith("/")) {
      navigate({ to: app.url });
      return;
    }
    const prefixes = app.allowedRedirectPrefixes ?? [];
    if (!sso || prefixes.length === 0) {
      await openInDefaultBrowser(app.url);
      if (sso) toast.info(`${app.name} ยังไม่ได้ตั้งค่า SSO — เปิดแบบปกติแทน`);
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
      toast.error(error instanceof Error ? error.message : "เปิดแอปไม่สำเร็จ");
    } finally {
      setPending(null);
    }
  }

  if (loading || (!user && status === "working")) {
    return (
      <FullScreenNotice
        icon={<Loader2 className="size-6 animate-spin" />}
        title="กำลังเข้าสู่ระบบ…"
      />
    );
  }

  if (!user) {
    return (
      <FullScreenNotice
        icon={<ShieldCheck className="size-6 text-primary" />}
        title={
          status === "needs-setup" ? "ยังไม่ได้ตั้งค่า LINE Login" : "เข้าสู่ระบบเพื่อเริ่มใช้งาน"
        }
        description={
          status === "needs-setup"
            ? "ต้องใส่ LINE Channel ID / Channel Secret และ LIFF ID ก่อน จึงจะล็อกอินผ่าน LINE ได้"
            : (message ??
              "เปิดหน้านี้จาก LINE เพื่อล็อกอินอัตโนมัติ หรือเข้าสู่ระบบด้วยอีเมล/Google")
        }
        action={
          <Button onClick={() => navigate({ to: "/auth" })} className="rounded-full px-6">
            เข้าสู่ระบบด้วยอีเมลหรือ Google
          </Button>
        }
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
              alt={profile.displayName ?? "โปรไฟล์ผู้ใช้"}
              className="size-12 rounded-2xl border border-border object-cover"
            />
          ) : (
            <img
              src={branding.logoSrc}
              alt={`โลโก้ ${branding.brand_name}`}
              className="size-12 rounded-2xl border border-border bg-card object-contain p-1"
            />
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {branding.brand_name}
            </p>
            <h1 className="text-lg font-semibold">
              สวัสดี{" "}
              {profile?.displayName ?? user.displayName ?? user.email?.split("@")[0] ?? "คุณ"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/admin" })}
              aria-label="จัดการ Launcher"
            >
              <Shield className="size-5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: settingsPath })}
            aria-label="ตั้งค่า"
          >
            <Settings2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="ออกจากระบบ"
            onClick={async () => {
              await signOut(auth);
              toast.success("ออกจากระบบแล้ว");
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
        ) : (appsQuery.data ?? []).length === 0 ? (
          <p className="mt-5 rounded-3xl border border-border bg-card/70 p-6 text-sm text-muted-foreground">
            ยังไม่มีแอปในกลุ่มนี้ — ผู้ดูแลระบบสามารถเพิ่มได้ในหน้าจัดการ Launcher
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
                    {app.icon === "sparkles" ? (
                      <Sparkles className="size-5" />
                    ) : (
                      <LayoutGrid className="size-5" />
                    )}
                  </span>
                  {!liffReady || pending === app.slug ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  )}
                </div>
                <span className="font-semibold">{app.name}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {app.description}
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
            {category === "social" ? "ไปที่แอปสำหรับธุรกิจ" : "ไปที่แอปของคุณ (Social)"}
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
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
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
