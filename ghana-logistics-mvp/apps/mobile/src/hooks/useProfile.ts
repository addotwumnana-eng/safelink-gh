import { useEffect, useState } from "react";
import type { AppRole, Profile } from "@/types/domain";
import { supabase } from "@/lib/supabase";

const defaultRole: AppRole = "customer";

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setProfile(null);
      return;
    }

    let isActive = true;
    setLoading(true);

    const loadProfile = async () => {
      try {
        const result = await supabase
          .from("profiles")
          .select("id, full_name, phone_number, role")
          .eq("id", userId)
          .single();

        if (!isActive) {
          return;
        }

        const data = result.data as
          | { id: string; full_name: string | null; phone_number: string | null; role: AppRole }
          | null;
        const error = result.error;

        if (error || !data) {
          setProfile({
            id: userId,
            full_name: null,
            phone_number: null,
            role: defaultRole
          });
        } else {
          setProfile({
            id: data.id,
            full_name: data.full_name,
            phone_number: data.phone_number,
            role: data.role as AppRole
          });
        }

        setLoading(false);
      } catch {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  return { profile, loading };
}
