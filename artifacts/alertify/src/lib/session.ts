/**
 * session.ts
 * Generates and persists a unique anonymous session ID per browser.
 * Uses crypto.randomUUID() for cryptographic randomness.
 * No login or personal data is ever stored.
 */

const SESSION_KEY = 'alertify_session_id';

function generateId(): string {
  // crypto.randomUUID() is available in all modern browsers (HTTPS required)
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `ANON-${uuid.toUpperCase()}`;
}

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Short display version of the session ID (last 8 chars) */
export function shortSession(): string {
  return getSessionId().slice(-8);
}
