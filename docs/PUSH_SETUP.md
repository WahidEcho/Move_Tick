# Server push notifications (FCM) — setup

Built in W8 (2026-07-16). Every in-app notification (ticket issued, refund
decision, waitlist promotion, org notices, event-ended, limit raised, …) is
mirrored as a real mobile push to all of the user's registered devices.
Without the env var below everything silently no-ops, so nothing breaks.

## The one thing you must do

1. Firebase console → project **move-tick-app** → ⚙ Project settings →
   **Service accounts** → **Generate new private key** → a JSON file downloads.
2. Add it to Vercel (and `.env.local` for local testing) as
   `FIREBASE_SERVICE_ACCOUNT_JSON` — paste the raw JSON, or base64 of it
   (both are accepted):

   ```
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"move-tick-app",...}
   ```

3. Redeploy. Done — no code changes needed.

## How it works

- `src/lib/push/fcm.ts` — FCM HTTP v1 client (service-account JWT → OAuth
  token, cached; no SDK dependency).
- `src/services/push.service.ts` — sends to all of a user's
  `device_push_tokens` rows and deletes tokens FCM reports dead.
- `src/services/notifications.service.ts#createNotification` — the choke
  point: in-app notification insert + push mirror.
- The mobile app registers tokens on login (`device_push_tokens` upsert) —
  already shipped in an earlier round.

## Known limitation

Organizer **event blasts** insert notifications inside the `send_event_blast`
Postgres RPC, which bypasses `createNotification`, so blasts currently reach
the in-app inbox but not push. If blasts-as-push matter, route the mobile
blast call through a web API endpoint instead of the RPC.
