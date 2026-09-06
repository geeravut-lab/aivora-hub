import { useQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";

/**
 * The role lives in a Firebase custom claim, so the check is a local token read
 * — no round trip. Security still comes from the rules and from
 * requireFirebaseAuth on the server; this only decides what UI to show.
 */
export function useIsAdmin(user: User | null | undefined) {
  const query = useQuery({
    queryKey: ["is-admin", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => {
      const result = await user!.getIdTokenResult();
      return result.claims["admin"] === true;
    },
  });

  return { isAdmin: query.data === true, isLoading: query.isLoading };
}
