export type AppRole = "customer" | "driver" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: AppRole;
}

export interface NearbyDriverCard {
  driver_id: string;
  full_name: string;
  municipality_name: string;
  distance_km: number;
  truck_type: string;
  capacity_kg: number;
  average_rating: number;
  photo_url: string | null;
}
