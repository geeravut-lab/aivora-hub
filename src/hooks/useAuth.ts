import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * onIdTokenChanged rather than onAuthStateChanged: it also fires when the token
 * is refreshed, which is how a newly granted admin claim reaches the UI without
 * a reload.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(
      auth,
      (next) => {
        setUser(next);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setUser(null);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { user, loading };
}
