import { supabase } from "@/lib/supabaseClient";

const ATTACHMENTS_BUCKET = "client-attachments";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function isAcceptedClientPhoto(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export async function uploadClientPhotos(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const filePath = `client-requests/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
    onProgress?.(index + 1, files.length);
  }

  return uploadedUrls;
}
