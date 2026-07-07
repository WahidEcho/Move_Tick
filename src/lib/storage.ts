import { createClient } from './supabase-browser';

export const EVENT_ASSETS_BUCKET = 'event-assets';
export const AVATARS_BUCKET = 'avatars';
export const PAYOUT_PROOFS_BUCKET = 'payout-proofs';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const ALLOWED_PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

/** Validate a proof-of-payment file (image or PDF, 10 MB max) before upload. */
export function validateProofFile(file: File): string | null {
  if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
    return 'Please choose an image (PNG, JPG, WEBP) or PDF file.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'File is too large. Maximum size is 10 MB.';
  }
  return null;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Validate an image file against the platform rules (type + 10 MB max) before
 * upload. Returns an error string, or null when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose an image file (PNG, JPG, WEBP, GIF, or SVG).';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. Maximum size is 10 MB.';
  }
  return null;
}

function fileExtension(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  const ext = (fromName || file.type.split('/')[1] || 'png').toLowerCase();
  return ext.replace(/[^a-z0-9]/g, '') || 'png';
}

/**
 * Upload an event image (cover or org logo) to the public event-assets bucket
 * under events/{orgId}/{uuid}.<ext> and return its public URL. Validates the
 * file first; throws with a friendly message on failure.
 */
export async function uploadEventImage(file: File, orgId: string): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const path = `events/${orgId}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabase.storage
    .from(EVENT_ASSETS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(EVENT_ASSETS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Upload a user's profile picture to the public avatars bucket under
 * {userId}/{uuid}.<ext> (RLS scopes writes to the owner) and return its public
 * URL. Validates the file first; throws with a friendly message on failure.
 */
export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Upload a proof-of-payment file to the private payout-proofs bucket under
 * {eventId}/{uuid}.<ext>. The bucket is admin-only (RLS: is_platform_admin()),
 * so it stores the storage path — not a public URL — for the admin UI to
 * resolve into a short-lived signed URL when viewed.
 */
export async function uploadPayoutProof(file: File, eventId: string): Promise<UploadResult> {
  const validationError = validateProofFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const path = `${eventId}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabase.storage
    .from(PAYOUT_PROOFS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { url: path, path };
}
