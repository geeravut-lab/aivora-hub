#!/usr/bin/env node
/**
 * Grant or revoke the admin claim directly, for when you cannot wait for a
 * sign-in to sync it from ADMIN_EMAILS.
 *
 *   npm run set-admin -- you@example.com
 *   npm run set-admin -- you@example.com --revoke
 *
 * The user must sign out and back in (or refresh their ID token) before the
 * new claim takes effect in the browser.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "node:fs";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const email = args.find((value) => !value.startsWith("--"));
const revoke = args.includes("--revoke");

if (!email) {
  console.error("ใช้: npm run set-admin -- you@example.com [--revoke]");
  process.exit(1);
}

/**
 * Read .env when the value is not already in the environment, so the usual
 * invocation is a bare `npm run set-admin` after filling in .env — no need to
 * juggle a service-account file path on the command line.
 */
function loadDotEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  try {
    process.loadEnvFile(".env");
  } catch {
    // no .env, or a Node older than 20.12 — fall through to the error below
  }
}

function loadServiceAccount() {
  loadDotEnv();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return JSON.parse(raw);
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) return JSON.parse(readFileSync(path, "utf8"));
  throw new Error(
    "ไม่พบ service account — ใส่ FIREBASE_SERVICE_ACCOUNT ใน .env, " +
      "หรือส่งมาทาง env var / GOOGLE_APPLICATION_CREDENTIALS",
  );
}

const account = loadServiceAccount();
initializeApp({
  credential: cert({
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: String(account.private_key).replace(/\\n/g, "\n"),
  }),
  projectId: account.project_id,
});

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}) };

if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);
console.log(`${revoke ? "revoked" : "granted"} admin for ${email} (${user.uid})`);
console.log("ให้ผู้ใช้ออกจากระบบแล้วเข้าใหม่ เพื่อให้ token ใบใหม่มี claim นี้");
