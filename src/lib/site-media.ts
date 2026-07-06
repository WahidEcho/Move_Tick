/**
 * Site-wide media configuration.
 *
 * HERO_VIDEO_URL — the showcase video that plays (muted, looping) behind the
 * landing-page hero. Leave it '' to show the animated aurora backdrop instead.
 *
 * To add your video (Mohamed):
 *  1. Drop an .mp4 into /public (e.g. /public/showcase.mp4) and set this to
 *     '/showcase.mp4', OR paste any direct https URL to an .mp4 file
 *     (Supabase Storage public URL works great).
 *  2. Keep it short (~15-30s), 1080p, and compressed (< ~10 MB) so the page
 *     stays fast. The video is muted + autoplay + loop per browser rules.
 */
export const HERO_VIDEO_URL = '';

/** Optional poster image shown while the video loads (or '' for none). */
export const HERO_VIDEO_POSTER = '';
