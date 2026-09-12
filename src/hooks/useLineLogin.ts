import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLineLauncherConfig, signInWithLine } from "@/lib/line-auth.functions";
import { ensureLiff } from "@/lib/liff";
import { useLang, type StringKey } from "@/lib/i18n";

export type LineLoginStatus = "idle" | "working" | "needs-setup" | "outside-line" | "error";

/** Auto sign-in with LINE when the launcher is opened from inside LINE (LIFF). */
export function useLineLogin() {
  const { user, loading } = useAuth();
  const getConfig = useServerFn(getLineLauncherConfig);
  const lineSignIn = useServerFn(signInWithLine);
  const [status, setStatus] = useState<LineLoginStatus>("idle");
  // Either a translatable key or a verbatim error from the server. Resolved
  // at render time so the sign-in effect does not depend on the language.
  const [message, setMessage] = useState<{ key: StringKey } | { text: string } | null>(null);
  const { t } = useLang();

  useEffect(() => {
    if (loading || user) return;
    let cancelled = false;

    (async () => {
      setStatus("working");
      try {
        const config = await getConfig();
        if (cancelled) return;
        if (!config.configured || !config.liffId) {
          setStatus("needs-setup");
          return;
        }

        const liff = await ensureLiff();
        if (!liff) {
          setStatus("needs-setup");
          return;
        }

        if (!liff.isInClient() && !liff.isLoggedIn()) {
          setStatus("outside-line");
          return;
        }
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          setStatus("error");
          setMessage({ key: "line.noIdToken" });
          return;
        }

        const { customToken } = await lineSignIn({ data: { idToken } });
        await signInWithCustomToken(auth, customToken);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setStatus("error");
        setMessage(error instanceof Error ? { text: error.message } : { key: "line.failed" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, getConfig, lineSignIn]);

  const resolved = message === null ? null : "key" in message ? t(message.key) : message.text;
  return { status, message: resolved, user, loading };
}
