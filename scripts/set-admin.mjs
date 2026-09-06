#!/usr/bin/env node
/**
 * Grant or revoke the admin claim directly, for when you cannot wait for a
 * sign-in to sync it from ADMIN_EMAILS.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...}' npm run set-admin -- you@example.com
 *   FIREBASE_SERVICE_ACCOUNT='{...}' npm run set-admin -- you@example.com --revoke
 *
 * The user must sign out and back in (or refresh their ID token) before the
 * new claim takes effect in the browser.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const email = args.find((value) => !value.startsWith("--"));
const revoke = args.includes("--revoke");

if (!email) {
  console.error("ใช้: npm run set-admin -- you@example.com [--revoke]");
  process.exit(1);
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return JSON.parse(raw);
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) return JSON.parse(readFileSync(path, "utf8"));
  throw new Error("ตั้ง FIREBASE_SERVICE_ACCOUNT หรือ GOOGLE_APPLICATION_CREDENTIALS ก่อน");
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
