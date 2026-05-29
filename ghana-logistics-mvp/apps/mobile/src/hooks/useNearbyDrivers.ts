import { useEffect, useState } from "react";
import type { NearbyDriverCard } from "@/types/domain";
import { supabase } from "@/lib/supabase";

export function useNearbyDrivers(municipality?: string) {
  const [drivers, setDrivers] = useState<NearbyDriverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("driver_discovery_view")
      .select(
        "driver_id, full_name, municipality_name, distance_km, truck_type, capacity_kg, average_rating, photo_url"
      )
      .order("distance_km", { ascending: true })
      .limit(20);

    if (municipality) {
      query = query.eq("municipality_name", municipality);
    }

    const loadNearbyDrivers = async () => {
      try {
        const result = await query;

        if (!isActive) {
          return;
        }

        const data = result.data as NearbyDriverCard[] | null;
        const fetchError = result.error;

        if (fetchError) {
          setError(fetchError.message);
          setDrivers([]);
        } else {
          setDrivers((data as NearbyDriverCard[]) ?? []);
        }
      } catch (reason: unknown) {
        if (isActive) {
          setError(reason instanceof Error ? reason.message : "Unknown error");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadNearbyDrivers();

    return () => {
      isActive = false;
    };
  }, [municipality]);

  return { drivers, loading, error };
}
