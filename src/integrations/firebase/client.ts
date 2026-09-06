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

let _app: FirebaseApp | undefined;

export function firebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length > 0 ? getApp() : initializeApp(readConfig());
  return _app;
}

/**
 * Lazy proxies so importing this module never touches the config. Route files
 * are evaluated during SSR too, where VITE_* may legitimately be absent.
 */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance, prop, receiver);
    },
  });
}

export const auth: Auth = lazy(() => getAuth(firebaseApp()));
export const db: Firestore = lazy(() => getFirestore(firebaseApp()));
export const storage: FirebaseStorage = lazy(() => getStorage(firebaseApp()));
