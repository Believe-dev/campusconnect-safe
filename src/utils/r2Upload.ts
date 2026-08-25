import { supabase } from '@/integrations/supabase/client';

// Uploads a new product image to Cloudflare R2 via a presigned URL minted by
// the r2-presign edge function. Existing product images already on Supabase
// Storage are never touched by this path.
export async function uploadProductImageToR2(file: File): Promise<string> {
  const { data, error } = await supabase.functions.invoke('r2-presign', {
    body: { contentType: file.type },
  });

  if (error || !data?.uploadUrl || !data?.publicUrl) {
    throw new Error(error?.message || 'Failed to get upload URL');
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload image');
  }

  return data.publicUrl as string;
}
