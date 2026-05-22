import type { TruckType } from "./types";

export const ACCRA_MUNICIPALITIES = [
  "Madina",
  "Adenta",
  "Tema",
  "Achimota",
  "Ablekuma",
  "Ga East",
  "Ashaiman",
  "Kasoa",
  "Circle",
  "Kaneshie"
] as const;

export const TRUCK_TYPE_LABELS: Record<TruckType, string> = {
  mini_truck: "Mini Truck",
  kia_rhino: "Kia Rhino",
  pickup: "Pickup",
  tipper_truck: "Tipper Truck",
  long_cargo_truck: "Long Cargo Truck"
};
