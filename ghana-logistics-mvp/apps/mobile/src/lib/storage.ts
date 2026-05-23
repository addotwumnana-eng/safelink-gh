import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

type UploadAsset = {
  uri: string;
  mimeType: string;
  extension: string;
};

export async function uploadImageAsset(
  bucket: "driver-documents" | "truck-photos",
  userId: string,
  folder: string,
  asset: UploadAsset
) {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${asset.extension}`;
  const objectPath = `${userId}/${folder}/${fileName}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);

  const { error } = await supabase.storage.from(bucket).upload(objectPath, decode(base64), {
    contentType: asset.mimeType,
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  return objectPath;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to convert image for upload."));
        return;
      }

      const [, base64] = result.split(",");
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(blob);
  });
}
