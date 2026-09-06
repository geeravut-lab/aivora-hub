import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const bodySchema = z.object({
  ticket: z.string().min(20).max(512),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/**
 * Child apps POST a one-time SSO ticket here and receive the central identity.
 * The ticket is short-lived, single-use, and bound to the app that requested it.
 *
 * The response shape is unchanged from the Supabase version on purpose — the
 * five child apps already integrate against it and must not need edits.
 */
export const Route = createFileRoute("/api/public/sso/exchange")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "invalid_request" }, 400);
        }

        const { hashTicket } = await import("@/lib/sso.server");
        const { getDoc, getUser, updateDocIfUnchanged } =
          await import("@/integrations/firebase/admin.server");
        const { COLLECTIONS, rolesFromClaims } = await import("@/integrations/firebase/schema");

        const ticketPath = `${COLLECTIONS.ssoTickets}/${hashTicket(parsed.ticket)}`;

        let claimed: { uid: string; appSlug: string } | null = null;
        try {
          const snap = await getDoc(ticketPath);
          const uid = snap.data["uid"] as string | undefined;
          const expiresAt = snap.data["expiresAt"] as number | undefined;
          const usedAt = snap.data["usedAt"] as number | null | undefined;

          if (snap.exists && uid && !usedAt && expiresAt && expiresAt >= Date.now()) {
            // Conditional on the updateTime we just read, so two concurrent
            // exchanges of the same ticket can never both win.
            const won = await updateDocIfUnchanged(
              ticketPath,
              { usedAt: Date.now() },
              snap.updateTime ?? "",
            );
            if (won) {
              claimed = { uid, appSlug: (snap.data["appSlug"] as string | undefined) ?? "" };
            }
          }
        } catch (error) {
          console.error("sso exchange failed", error);
          return json({ error: "server_error" }, 500);
        }

        if (!claimed) return json({ error: "invalid_ticket" }, 401);

        const [profileSnap, user] = await Promise.all([
          getDoc(`${COLLECTIONS.profiles}/${claimed.uid}`),
          getUser(claimed.uid).catch(() => null),
        ]);

        const profile = profileSnap.data as {
          displayName?: string | null;
          avatarUrl?: string | null;
          email?: string | null;
        };
        const roleList = rolesFromClaims(user?.claims);
        const email = profile.email ?? user?.email ?? null;

        // Child apps on Firebase sign in with a custom token minted against
        // their own project, so their existing Firebase code keeps working.
        let firebase: { custom_token: string; project_id: string } | null = null;
        if (claimed.appSlug) {
          try {
            const { mintFirebaseCustomToken } = await import("@/lib/firebase-token.server");
            const minted = await mintFirebaseCustomToken(claimed.appSlug, claimed.uid, {
              aivora_user_id: claimed.uid,
              email,
              display_name: profile.displayName ?? null,
              roles: roleList,
            });
            if (minted) firebase = { custom_token: minted.token, project_id: minted.projectId };
          } catch (mintError) {
            console.error("firebase custom token mint failed", mintError);
          }
        }

        return json({
          user: {
            id: claimed.uid,
            display_name: profile.displayName ?? user?.displayName ?? null,
            avatar_url: profile.avatarUrl ?? user?.photoUrl ?? null,
            email,
            roles: roleList,
          },
          app_slug: claimed.appSlug || null,
          firebase,
        });
      },
    },
  },
});
