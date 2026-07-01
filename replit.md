# Alertify — Anonymous Localized SOS

A privacy-first emergency broadcast app. Users send SOS alerts (Medical, Safety, Technical Help) anonymously with GPS location — no account required. Nearby helpers see alerts on a live map and can open an ephemeral 2-hour chat.

## Run & Operate

- `pnpm --filter @workspace/alertify run dev` — run the frontend (port auto-assigned by Replit)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- Firebase configuration lives in `artifacts/alertify/src/lib/firebase.ts`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React 18 + Vite + Tailwind CSS v4
- **Mapping:** Leaflet.js (vanilla, in useEffect)
- **Realtime backend:** Firebase Firestore
- **Fonts/Icons:** Inter + Material Symbols Outlined (Google CDN)

## Where things live

- `artifacts/alertify/src/` — main frontend app
  - `lib/firebase.ts` — **Firebase config + all Firestore helpers** (replace placeholder keys here)
  - `lib/session.ts` — anonymous session ID (crypto.randomUUID, persisted in localStorage)
  - `lib/geo.ts` — geolocation, Haversine distance, coord formatting
  - `pages/SOSDashboard.tsx` — SOS broadcast screen
  - `pages/LiveMap.tsx` — Leaflet map with real-time alert markers (2km radius)
  - `pages/Chat.tsx` — ephemeral per-alert chat
  - `components/BottomNav.tsx` — tab navigation
- `artifacts/alertify/src/index.css` — Tailwind v4 design tokens (Alertify color palette)

## Architecture decisions

- **No auth:** Session IDs use `crypto.randomUUID()` for randomness, stored only in localStorage. Server never sees them.
- **Firebase Firestore** for real-time alert sync — each alert has an `expiresAt` Timestamp (2hr TTL). Client-side filtering on every snapshot drops expired docs without re-querying.
- **2km radius:** LiveMap subscribes to all non-expired alerts but filters markers to ≤2km from the user's GPS position. Without GPS, all alerts are shown.
- **Ephemeral chat:** Each message gets its own `expiresAt` field matching the parent alert's 2hr TTL. No permanent message history.
- **Leaflet** initialised in a `useEffect` with cleanup on unmount. Markers tracked in a `Map<id, L.Marker>` ref and reconciled on every Firestore snapshot.

## Firebase Setup

1. Create a project at https://console.firebase.google.com/
2. Enable **Firestore Database** (test mode for dev)
3. Copy your `firebaseConfig` object into `artifacts/alertify/src/lib/firebase.ts`
4. Paste these **Security Rules** in Firestore → Rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /alerts/{alertId} {
         allow read: if true;
         allow create: if request.resource.data.expiresAt is timestamp;
         allow delete: if true;
       }
       match /chats/{alertId}/messages/{msgId} {
         allow read, write: if true;
       }
     }
   }
   ```

## Product

- **SOS Dashboard** — pulsing broadcast button, GPS location card, specific assistance categories
- **Live Map** — OpenStreetMap tiles via Leaflet, colored markers by type (Red/Blue/Yellow), 2km radius circle, alert popup with "I Can Help" button
- **Ephemeral Chat** — real-time Firestore messages, auto-expire after 2h, no history stored

## User preferences

- App name: **Alertify** (not Sahaay)
- Anonymous by default — no login ever
- Alert categories: Medical (red), Safety (blue), Technical Help (yellow)

## Gotchas

- The app requires Firebase config to be filled in before alerts/chat work. The UI shows a setup notice until then.
- GPS must be granted in the browser. Denied GPS shows a banner and falls back to showing all alerts on the map.
- Firestore `where('expiresAt', '>', ...)` requires a composite index if sorting by another field — Firestore will prompt you with a direct link to create it on first query.
