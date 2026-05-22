import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    supabase.auth
      .getSession()
      .then((result) => {
        if (isActive) {
          setSession(result.data.session ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
