import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";
import { useServerFn } from "@tanstack/react-start";
import { BrandMark } from "@/components/BrandMark";
import { auth } from "@/integrations/firebase/client";
import { syncMyAccount } from "@/lib/line-auth.functions";
import { isLineInAppBrowser } from "@/lib/open-external";
import { useAuth } from "@/hooks/useAuth";
import { useLang, type StringKey } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — Aivora Launcher" },
      {
        name: "description",
        content: "เข้าสู่ระบบด้วยอีเมล รหัสผ่าน หรือบัญชี Google เพื่อใช้งานทุกแอป",
      },
      { property: "og:title", content: "เข้าสู่ระบบ — Aivora Launcher" },
      {
        property: "og:description",
        content: "เข้าสู่ระบบด้วยอีเมล รหัสผ่าน หรือบัญชี Google เพื่อใช้งานทุกแอป",
      },
    ],
  }),
  component: AuthPage,
});

function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/** Firebase messages are English error codes; show something a user can act on. */
function authErrorKey(error: unknown): StringKey | null {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "auth.err.invalidCredential";
    case "auth/email-already-in-use":
      return "auth.err.emailInUse";
    case "auth/weak-password":
      return "auth.err.weakPassword";
    case "auth/too-many-requests":
      return "auth.err.tooMany";
    case "auth/network-request-failed":
      return "auth.err.network";
    default:
      return null;
  }
}

function AuthPage() {
  const { next } = Route.useSearch();
  const { user } = useAuth();
  const { lang, setLang, t } = useLang();
  const syncClaim = useServerFn(syncMyAccount);

  function readableAuthError(error: unknown): string {
    const key = authErrorKey(error);
    if (key) return t(key);
    return error instanceof Error ? error.message : t("auth.err.generic");
  }
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = safeNext(next);

  // A Google sign-in that went through the redirect flow lands back here.
  useEffect(() => {
    void getRedirectResult(auth).catch((error) => {
      console.error(error);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        // The admin claim is granted server-side from ADMIN_EMAILS; refresh the
        // token so the new claim is present before the launcher renders.
        // Never let this hold the user on the login screen — a slow or failing
        // sync only costs the admin badge until the next sign-in.
        const { changed } = await Promise.race([
          syncClaim(),
          new Promise<{ changed: boolean }>((_, reject) =>
            setTimeout(() => reject(new Error("sync timed out")), 5000),
          ),
        ]);
        if (changed) await auth.currentUser?.getIdToken(true);
      } catch (error) {
        console.error(error);
      }
      if (!cancelled) window.location.replace(destination);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, destination, syncClaim]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName || email.split("@")[0] || t("auth.defaultName");
        await updateProfile(credential.user, { displayName: name });
        void sendEmailVerification(credential.user).catch(() => undefined);
        toast.success(t("auth.accountCreated"));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      toast.error(readableAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const provider = new GoogleAuthProvider();
    try {
      // LINE's in-app browser blocks the popup, so go straight to redirect there.
      if (isLineInAppBrowser()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error(readableAuthError(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="absolute right-5 top-5">
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>
      <div className="w-full max-w-sm">
        <BrandMark className="mb-8" size="lg" />

        <div className="rounded-3xl border border-border bg-card/70 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("auth.displayName")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.displayNamePlaceholder")}
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("common.or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            {t("auth.google")}
          </Button>

          <button
            type="button"
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? t("auth.toSignUp") : t("auth.toSignIn")}
          </button>
        </div>
      </div>
    </main>
  );
}
