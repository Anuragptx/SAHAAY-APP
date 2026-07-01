/**
 * firebase.ts
 * ============================================================
 * FIREBASE CONFIGURATION — ALERTIFY
 * ============================================================
 *
 * HOW TO CONNECT YOUR OWN FIREBASE PROJECT:
 *
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or open an existing one)
 * 3. Click "Add app" → select Web (</>)
 * 4. Register the app and copy the firebaseConfig object shown
 * 5. Replace the placeholder values below with your real values
 * 6. In the Firebase console → Firestore Database → Create database
 *    → Start in "test mode" for development
 *
 * FIRESTORE COLLECTIONS USED:
 *   alerts/           — active SOS alerts (auto-expire after 2 hours)
 *   chats/{alertId}/messages/ — ephemeral chat messages per alert
 *
 * SECURITY RULES (paste into Firestore Rules tab):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /alerts/{alertId} {
 *         allow read, write: if true;
 *       }
 *       match /chats/{alertId}/messages/{msgId} {
 *         allow read, write: if true;
 *       }
 *     }
 *   }
 * ============================================================
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';

// ↓↓↓ REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES ↓↓↓
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
// ↑↑↑ REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES ↑↑↑

// Prevent duplicate initialisation in HMR / dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type AlertCategory = 'Medical' | 'Safety' | 'Technical Help';

export interface Alert {
  id?: string;
  sessionId: string;
  category: AlertCategory;
  lat: number;
  lng: number;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
}

export interface ChatMessage {
  id?: string;
  sessionId: string;
  text: string;
  sentAt: Timestamp | null;
}

// ============================================================
// ALERT HELPERS
// ============================================================

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Broadcast a new SOS alert. Returns the Firestore doc ID. */
export async function broadcastAlert(
  sessionId: string,
  category: AlertCategory,
  lat: number,
  lng: number,
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_HOURS_MS);
  const ref = await addDoc(collection(db, 'alerts'), {
    sessionId,
    category,
    lat,
    lng,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return ref.id;
}

/** Subscribe to all non-expired alerts. Returns unsubscribe fn.
 *  Client-side re-filtering on every snapshot ensures alerts that expire
 *  during a session are dropped from state without needing a new query.
 */
export function subscribeToAlerts(
  onUpdate: (alerts: Alert[]) => void,
): () => void {
  // Use a slightly past timestamp so Firestore index is used, but filter
  // precisely by wall-clock on every snapshot to handle runtime expiry.
  const queryStart = Timestamp.fromDate(new Date(Date.now() - 60_000));
  const q = query(
    collection(db, 'alerts'),
    where('expiresAt', '>', queryStart),
    orderBy('expiresAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const nowMs = Date.now();
    const alerts: Alert[] = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Alert, 'id'>) }))
      // Client-side filter: drop anything whose expiry has already passed
      .filter((a) => a.expiresAt && a.expiresAt.toMillis() > nowMs);
    onUpdate(alerts);
  });
}

/** Delete expired alerts (call on app load for cleanup). */
export async function purgeExpiredAlerts(): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  const q = query(
    collection(db, 'alerts'),
    where('expiresAt', '<=', now),
  );
  const snap = await getDocs(q);
  const deletions = snap.docs.map((d) => deleteDoc(doc(db, 'alerts', d.id)));
  await Promise.all(deletions);
}

// ============================================================
// CHAT HELPERS
// ============================================================

/** Send a message in an alert's ephemeral chat.
 *  Each message carries its own expiresAt (2hr from now) so Firestore TTL
 *  policies and client-side filtering can both enforce ephemerality.
 */
export async function sendMessage(
  alertId: string,
  sessionId: string,
  text: string,
): Promise<void> {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + TWO_HOURS_MS));
  await addDoc(collection(db, 'chats', alertId, 'messages'), {
    sessionId,
    text: text.trim(),
    sentAt: serverTimestamp(),
    expiresAt,
  });
}

/** Subscribe to messages for a given alert. Returns unsubscribe fn. */
export function subscribeToMessages(
  alertId: string,
  onUpdate: (messages: ChatMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'chats', alertId, 'messages'),
    orderBy('sentAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ChatMessage, 'id'>),
    }));
    onUpdate(msgs);
  });
}
