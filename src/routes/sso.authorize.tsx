import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { issueSsoTicket } from "@/lib/sso.functions";

const searchSchema = z.object({
  app: z.string().min(1).max(64),
  return: z.string().min(8).max(2048),
});

export const Route = createFileRoute("/sso/authorize")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "ส่งต่อการเข้าสู่ระบบ — Aivora" },
      { name: "description", content: "กำลังส่งต่อการเข้าสู่ระบบไปยังแอปที่คุณเลือก" },
      { property: "og:title", content: "ส่งต่อการเข้าสู่ระบบ — Aivora" },
      { property: "og:description", content: "กำลังส่งต่อการเข้าสู่ระบบไปยังแอปที่คุณเลือก" },
    ],
  }),
  component: SsoAuthorize,
});

/**
 * Child-app entry point: /sso/authorize?app=<slug>&return=<https url>
 * Signs the user in if needed, then redirects back with a one-time ticket.
 */
function SsoAuthorize() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLang();
  const issue = useServerFn(issueSsoTicket);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = `/sso/authorize?app=${encodeURIComponent(search.app)}&return=${encodeURIComponent(search.return)}`;
      navigate({ to: "/auth", search: { next } });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { redirectTo } = await issue({
          data: { appSlug: search.app, redirectUri: search.return },
        });
        if (!cancelled) window.location.replace(redirectTo);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("sso.forwardFailed"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, search.app, search.return, issue, navigate, t]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/70 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15">
          {error ? (
            <ShieldCheck className="size-5 text-primary" />
          ) : (
            <Loader2 className="size-5 animate-spin" />
          )}
        </div>
        <h1 className="mt-5 text-lg font-semibold">
          {error ? t("sso.failedTitle") : t("sso.forwarding")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? search.app}</p>
      </div>
    </main>
  );
}
