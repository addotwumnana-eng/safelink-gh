import type { DriverOnboardingProgress, TruckType } from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { uploadImageAsset } from "@/lib/storage";

type UploadSelection = {
  uri: string;
  mimeType: string;
  extension: string;
};

type SubmitDriverOnboardingInput = {
  userId: string;
  municipalityName: string;
  ghanaCardNumber: string;
  truckType: TruckType;
  truckDisplayName: string;
  licensePlate: string;
  loadCapacityKg: string;
  dimensionLengthM: string;
  dimensionWidthM: string;
  dimensionHeightM: string;
  cargoExamples: string;
  ghanaCardImage: UploadSelection;
  selfieImage: UploadSelection;
  truckPhotos: UploadSelection[];
};

export async function getDriverOnboardingProgress(
  userId: string
): Promise<DriverOnboardingProgress> {
  const [driverResult, documentsResult, vehiclesResult] = await Promise.all([
    supabase
      .from("drivers")
      .select("ghana_card_number, municipality_id")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("driver_documents")
      .select("document_type")
      .eq("driver_id", userId),
    supabase
      .from("vehicles")
      .select("id, photo_urls")
      .eq("driver_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
  ]);

  if (driverResult.error) {
    throw new Error(driverResult.error.message);
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  if (vehiclesResult.error) {
    throw new Error(vehiclesResult.error.message);
  }

  const documentTypes = new Set(
    (documentsResult.data ?? []).map((item) => item.document_type)
  );
  const vehiclePhotoUrls = vehiclesResult.data?.photo_urls ?? [];

  const progress: DriverOnboardingProgress = {
    hasGhanaCardNumber: Boolean(driverResult.data?.ghana_card_number),
    hasMunicipality: Boolean(driverResult.data?.municipality_id),
    hasGhanaCardImage: documentTypes.has("ghana_card_front"),
    hasSelfieImage: documentTypes.has("selfie_verification"),
    hasTruckPhotos: vehiclePhotoUrls.length > 0,
    hasVehicleProfile: Boolean(vehiclesResult.data?.id),
    complete: false
  };

  progress.complete =
    progress.hasGhanaCardNumber &&
    progress.hasMunicipality &&
    progress.hasGhanaCardImage &&
    progress.hasSelfieImage &&
    progress.hasTruckPhotos &&
    progress.hasVehicleProfile;

  return progress;
}

export async function submitDriverOnboarding(input: SubmitDriverOnboardingInput) {
  const municipalityName = input.municipalityName.trim();
  const ghanaCardNumber = input.ghanaCardNumber.trim();
  const truckDisplayName = input.truckDisplayName.trim();
  const licensePlate = input.licensePlate.trim().toUpperCase();
  const cargoExamples = input.cargoExamples
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const loadCapacityKg = Number(input.loadCapacityKg);
  const dimensionLengthM = Number(input.dimensionLengthM);
  const dimensionWidthM = Number(input.dimensionWidthM);
  const dimensionHeightM = Number(input.dimensionHeightM);

  if (!ghanaCardNumber || !municipalityName || !truckDisplayName || !licensePlate) {
    throw new Error("Please complete all required fields.");
  }

  if (
    Number.isNaN(loadCapacityKg) ||
    Number.isNaN(dimensionLengthM) ||
    Number.isNaN(dimensionWidthM) ||
    Number.isNaN(dimensionHeightM)
  ) {
    throw new Error("Truck dimensions and capacity must be valid numbers.");
  }

  if (input.truckPhotos.length === 0) {
    throw new Error("At least one truck photo is required.");
  }

  const { data: municipality, error: municipalityError } = await supabase
    .from("municipalities")
    .select("id")
    .eq("name", municipalityName)
    .single();

  if (municipalityError || !municipality) {
    throw new Error("Selected municipality is unavailable.");
  }

  const ghanaCardPath = await uploadImageAsset(
    "driver-documents",
    input.userId,
    "ghana-card",
    input.ghanaCardImage
  );
  const selfiePath = await uploadImageAsset(
    "driver-documents",
    input.userId,
    "selfie",
    input.selfieImage
  );

  const truckPhotoPaths: string[] = [];
  for (const truckPhoto of input.truckPhotos) {
    const photoPath = await uploadImageAsset("truck-photos", input.userId, "truck", truckPhoto);
    truckPhotoPaths.push(photoPath);
  }

  const { error: updateDriverError } = await supabase.from("drivers").upsert(
    {
      user_id: input.userId,
      municipality_id: municipality.id,
      ghana_card_number: ghanaCardNumber,
      ghana_card_verified: false,
      verification_status: "pending",
      is_online: false
    },
    { onConflict: "user_id" }
  );

  if (updateDriverError) {
    throw new Error(updateDriverError.message);
  }

  const { error: deleteDocumentsError } = await supabase
    .from("driver_documents")
    .delete()
    .eq("driver_id", input.userId)
    .in("document_type", ["ghana_card_front", "selfie_verification"]);

  if (deleteDocumentsError) {
    throw new Error(deleteDocumentsError.message);
  }

  const { error: insertDocumentsError } = await supabase.from("driver_documents").insert([
    {
      driver_id: input.userId,
      document_type: "ghana_card_front",
      file_url: ghanaCardPath,
      verification_status: "pending"
    },
    {
      driver_id: input.userId,
      document_type: "selfie_verification",
      file_url: selfiePath,
      verification_status: "pending"
    }
  ]);

  if (insertDocumentsError) {
    throw new Error(insertDocumentsError.message);
  }

  const { error: upsertVehicleError } = await supabase.from("vehicles").upsert(
    {
      driver_id: input.userId,
      municipality_id: municipality.id,
      truck_type: input.truckType,
      display_name: truckDisplayName,
      license_plate: licensePlate,
      dimension_length_m: dimensionLengthM,
      dimension_width_m: dimensionWidthM,
      dimension_height_m: dimensionHeightM,
      load_capacity_kg: loadCapacityKg,
      cargo_examples: cargoExamples,
      photo_urls: truckPhotoPaths,
      is_active: true
    },
    { onConflict: "license_plate" }
  );

  if (upsertVehicleError) {
    throw new Error(upsertVehicleError.message);
  }

  return getDriverOnboardingProgress(input.userId);
}
