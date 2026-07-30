import { createHash } from 'crypto';
import sharp from 'sharp';

/**
 * Renders an attendee's profile photo as a circular, semi-transparent PNG —
 * used on the Apple Wallet pass thumbnail, the emailed PDF ticket, and (via
 * plain CSS) the web ticket card.
 *
 * Every failure path returns `null` on purpose. A missing, slow, oversized or
 * untrusted avatar must never break a pass, a PDF, or a ticket email — the
 * caller simply omits the photo and renders exactly as it did before.
 */

const FETCH_TIMEOUT_MS = 2_500;
const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_MAX_ENTRIES = 200;

/** Processed PNGs keyed by url+size+opacity. Serverless instances are reused, so this pays off. */
const cache = new Map<string, Buffer>();

function cacheGet(key: string): Buffer | undefined {
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency so the cap evicts genuinely cold entries.
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: Buffer): void {
  cache.set(key, value);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Avatar URLs come from the database but are ultimately user-influenceable, so
 * fetching them server-side is an SSRF surface. Only the two hosts that can
 * legitimately serve our avatars are allowed: Google (OAuth sign-in photos) and
 * this project's own Supabase storage (uploaded photos).
 */
function isAllowedAvatarHost(hostname: string): boolean {
  if (hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com')) {
    return true;
  }
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
    return Boolean(supabaseHost) && hostname === supabaseHost;
  } catch {
    return false;
  }
}

async function fetchImageBytes(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) return null;

    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) return null;

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_BYTES) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    // Re-check: content-length is a hint, not a guarantee.
    return bytes.byteLength > MAX_BYTES ? null : bytes;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A circular alpha mask as a raw RGBA buffer.
 *
 * Deliberately built pixel-by-pixel rather than by rasterizing an SVG: it keeps
 * this off sharp's SVG/librsvg path (one less thing that can behave differently
 * in a serverless runtime) and lets us antialias the edge ourselves.
 *
 * Composited with `dest-in`, the result alpha is `image.alpha * mask.alpha`, so
 * a mask painted at `opacity` yields the faded circle in a single step.
 */
function buildCircleMask(size: number, opacity: number): Buffer {
  const mask = Buffer.alloc(size * size * 4);
  const radius = size / 2;
  const peak = Math.round(255 * opacity);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - radius;
      const dy = y + 0.5 - radius;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Linear falloff across the outermost pixel smooths the circle's edge.
      let coverage = 1;
      if (distance >= radius) coverage = 0;
      else if (distance > radius - 1) coverage = radius - distance;

      const offset = (y * size + x) * 4;
      mask[offset] = 255;
      mask[offset + 1] = 255;
      mask[offset + 2] = 255;
      mask[offset + 3] = Math.round(peak * coverage);
    }
  }
  return mask;
}

/**
 * Fetch `url` and return a square PNG containing the photo cropped to a faded
 * circle, or `null` if there is no usable avatar.
 *
 * @param size    Output width/height in pixels.
 * @param opacity Circle opacity, 0–1. The default reads as a subtle accent
 *                rather than a portrait competing with the ticket content.
 */
export async function getCircularAvatarPng(
  url: string | null | undefined,
  size: number,
  opacity = 0.55
): Promise<Buffer | null> {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || !isAllowedAvatarHost(parsed.hostname)) return null;

  const key = createHash('sha256').update(`${url}|${size}|${opacity}`).digest('hex');
  const cached = cacheGet(key);
  if (cached) return cached;

  const source = await fetchImageBytes(url);
  if (!source) return null;

  try {
    const png = await sharp(source)
      // `attention` biases the crop toward the most feature-dense region, which
      // keeps faces in frame on off-centre photos.
      .resize(size, size, { fit: 'cover', position: 'attention' })
      .ensureAlpha()
      .composite([
        {
          input: buildCircleMask(size, opacity),
          raw: { width: size, height: size, channels: 4 },
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    cacheSet(key, png);
    return png;
  } catch {
    // Corrupt or unsupported image data — treat exactly like "no avatar".
    return null;
  }
}
