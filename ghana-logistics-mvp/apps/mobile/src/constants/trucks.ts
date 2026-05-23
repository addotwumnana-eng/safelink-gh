import type { TruckType } from "@/types/domain";

export const TRUCK_TYPE_OPTIONS: Array<{ value: TruckType; label: string }> = [
  { value: "mini_truck", label: "Mini Truck" },
  { value: "kia_rhino", label: "Kia Rhino" },
  { value: "pickup", label: "Pickup" },
  { value: "tipper_truck", label: "Tipper Truck" },
  { value: "long_cargo_truck", label: "Long Cargo Truck" }
];
