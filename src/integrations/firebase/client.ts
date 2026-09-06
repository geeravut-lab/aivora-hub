import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Browser-side Firebase. Every value here is public by design — access is
 * governed by Firestore/Storage security rules, never by hiding the config.
 *
 * Vite inlines VITE_* at build time, so changing any of these needs a rebuild,
 * not just a redeploy of the same artifact.
 */
function readConfig() {
  const config = {
    apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
    authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
    projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
    storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"],
    messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
    appId: import.meta.env["VITE_FIREBASE_APP_ID"],
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);

  if (missing.length > 0) {
    throw new Error(
      `ยังไม่ได้ตั้งค่า Firebase: ขาด ${missing.join(", ")} — ใส่ค่าใน .env แล้ว build ใหม่`,
    );
  }

  return config as Required<typeof config>;
}

function createApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(readConfig());
}

/**
 * These MUST be the real SDK objects, not lazy proxies.
 *
 * A Proxy that forwards property access still fails `instanceof`, because the
 * prototype comes from the proxy target. `collection()`, `doc()` and `ref()`
 * all cast their first argument with an instanceof check, so a proxied
 * Firestore throws "Expected first argument to collection() to be a
 * CollectionReference, a DocumentReference or FirebaseFirestore" on every
 * single read. Auth happens to tolerate it, which makes the failure look like
 * "login works but no data loads".
 *
 * The whole module is client-only: every route that touches Firebase is
 * `ssr: false`, but the module is still evaluated during SSR, so on the server
 * these stay undefined instead of throwing over a missing config.
 */
const isBrowser = typeof window !== "undefined";

export const firebaseApp = (isBrowser ? createApp() : undefined) as FirebaseApp;
export const auth = (isBrowser ? getAuth(firebaseApp) : undefined) as Auth;
export const db = (isBrowser ? getFirestore(firebaseApp) : undefined) as Firestore;
export const storage = (isBrowser ? getStorage(firebaseApp) : undefined) as FirebaseStorage;
