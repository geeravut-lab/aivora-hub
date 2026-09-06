import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLineLauncherConfig, signInWithLine } from "@/lib/line-auth.functions";
import { ensureLiff } from "@/lib/liff";

export type LineLoginStatus = "idle" | "working" | "needs-setup" | "outside-line" | "error";

/** Auto sign-in with LINE when the launcher is opened from inside LINE (LIFF). */
export function useLineLogin() {
  const { user, loading } = useAuth();
  const getConfig = useServerFn(getLineLauncherConfig);
  const lineSignIn = useServerFn(signInWithLine);
  const [status, setStatus] = useState<LineLoginStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

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
          setMessage("ไม่ได้รับ ID token จาก LINE");
          return;
        }

        const { customToken } = await lineSignIn({ data: { idToken } });
        await signInWithCustomToken(auth, customToken);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, getConfig, lineSignIn]);

  return { status, message, user, loading };
}
