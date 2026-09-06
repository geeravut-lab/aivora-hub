#!/usr/bin/env node
/**
 * Seed the launcher with its starting content: the six apps and the branding
 * document. Safe to run more than once — every write is a merge, so anything
 * edited in the admin page afterwards is preserved except the fields below.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...}' npm run seed
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const db = getFirestore();

/** Social apps hand off an SSO ticket. Business apps just open. */
const APPS = [
  {
    slug: "life-os",
    name: "Life OS",
    description: "ระบบจัดการชีวิตหลัก",
    url: "https://nong-phum-s-life-os.lovable.app/",
    icon: "layout-grid",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://nong-phum-s-life-os.lovable.app/sso/callback"],
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "tantun",
    name: "ทันทุน (TanTun)",
    description: "ระบบบริหารเงินและทุน",
    url: "https://tantunth.netlify.app/",
    icon: "wallet",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://tantunth.netlify.app/sso/callback"],
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "jaiklai",
    name: "ใจใกล้ (Jaiklai)",
    description: "ระบบดูแลใจและความสัมพันธ์",
    url: "https://jaiklai.netlify.app/",
    icon: "heart-handshake",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://jaiklai.netlify.app/sso/callback"],
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: "harmony",
    name: "Harmony",
    description: "ระบบสร้างสมดุลชีวิต",
    url: "https://xharmony.netlify.app/",
    icon: "music-4",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://xharmony.netlify.app/sso/callback"],
    sortOrder: 4,
    isActive: true,
  },
  {
    slug: "songmu",
    name: "ส่องมู ดูเลข",
    description: "ระบบวิเคราะห์ตัวเลขและความเชื่อ",
    url: "https://songmu.netlify.app/",
    icon: "sparkles",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://songmu.netlify.app/sso/callback"],
    sortOrder: 5,
    isActive: true,
  },
  {
    slug: "youngwai",
    name: "ยังไหว (YoungWai)",
    description: "ระบบดูแลสุขภาพและพลังชีวิต",
    url: "https://youngwai.netlify.app/",
    icon: "activity",
    accent: "primary",
    category: "social",
    allowedRedirectPrefixes: ["https://youngwai.netlify.app/sso/callback"],
    sortOrder: 6,
    isActive: true,
  },
];

const batch = db.batch();

for (const app of APPS) {
  // Slug as the document id keeps re-runs idempotent.
  batch.set(
    db.collection("apps").doc(app.slug),
    { ...app, updatedAt: new Date() },
    { merge: true },
  );
}

batch.set(
  db.collection("branding").doc("singleton"),
  {
    brandName: "Aivora",
    tagline: "ล็อกอินครั้งเดียว เข้าได้ทุกแอปในระบบ",
    updatedAt: new Date(),
  },
  { merge: true },
);

await batch.commit();

console.log(`seeded ${APPS.length} apps + branding into ${account.project_id}`);
console.log("แก้ URL และ allow-list ที่เหลือได้ในหน้า /admin");
