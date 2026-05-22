export type AppRole = "customer" | "driver" | "admin";

export type TruckType =
  | "mini_truck"
  | "kia_rhino"
  | "pickup"
  | "tipper_truck"
  | "long_cargo_truck";

export type BookingStatus =
  | "pending"
  | "driver_assigned"
  | "accepted"
  | "arrived_pickup"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed";

export interface Municipality {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  truck_type: TruckType;
  display_name: string;
  load_capacity_kg: number;
  dimension_length_m: number;
  dimension_width_m: number;
  dimension_height_m: number;
  photo_urls: string[];
}
