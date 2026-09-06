# Aivora Hub — LINE Launcher + SSO

LIFF launcher ที่เปิดจาก rich menu ของ LINE OA แล้วยิงผู้ใช้เข้าเว็บแอปต่าง ๆ
ด้วยเบราว์เซอร์ภายนอก โดยหน้า Launcher ใน LINE ยังคงอยู่ที่เดิม

- **`/`** — แอปกลุ่ม Social ใช้ SSO (ตั๋วใช้ครั้งเดียว → แอปลูกแลกเป็น session ของตัวเอง)
- **`/business`** — แอปกลุ่ม Business เปิดตรง ๆ ผู้ใช้ล็อกอินที่แอปนั้นเอง
- **`/admin`** — จัดการรายการแอปทั้งสองกลุ่ม ชื่อแบรนด์ และโลโก้

Stack: TanStack Start (SSR + server functions) · React 19 · Tailwind 4 · shadcn/ui ·
Firebase Auth + Firestore + Storage · deploy บน Netlify

> เดิมโปรเจกต์นี้สร้างด้วย Lovable + Lovable Cloud (Supabase) — repo นี้คือเวอร์ชันที่
> ย้ายออกมาแล้ว ไม่มีอะไรผูกกับ Lovable เหลืออยู่

---

## สถาปัตยกรรม

```
LINE OA rich menu
  ├─ ปุ่ม 1 → LIFF (endpoint = hub) → "/"          → Social apps  (SSO)
  └─ ปุ่ม 2 → LIFF (endpoint = hub) → "/business"  → Business apps (ไม่ SSO)

hub
  ├─ LINE ID token → verify กับ api.line.me → Firebase custom token → signInWithCustomToken
  ├─ /sso/authorize?app=<slug>&return=<url>  → ออกตั๋วใช้ครั้งเดียว อายุ 60 วินาที
  └─ /api/public/sso/exchange (POST)         → แลกตั๋ว → { user, app_slug, firebase }
```

**สัญญากับแอปลูกไม่เปลี่ยนจากเวอร์ชัน Supabase** — `/api/public/sso/exchange` ยังคืน
`{ user: { id, display_name, avatar_url, email, roles }, app_slug, firebase: { custom_token, project_id } }`
เหมือนเดิม แอปลูกทั้ง 5 ตัวจึงไม่ต้องแก้อะไรนอกจาก `HUB_URL`

### หมายเหตุสำคัญเรื่องฝั่งเซิร์ฟเวอร์

โค้ดเซิร์ฟเวอร์**ไม่ได้ใช้ `firebase-admin`** แต่เรียก REST API ของ Google ตรง ๆ
(`src/integrations/firebase/*.server.ts`) เพราะ `firebase-admin/firestore` ดึง
`@google-cloud/firestore` ซึ่งโหลดไฟล์ `.proto` ด้วย `__dirname` — bundle เข้า ESM
serverless function แล้ว build ผ่าน แต่พังตอน runtime ด้วย
`__dirname is not defined`

ผลพลอยได้: function bundle เล็กลงจาก ~9 MB เหลือ ~4 MB และรันได้ทุก runtime
`firebase-admin` ยังอยู่ใน devDependencies เพราะสคริปต์ใน `scripts/` ใช้ (รันบนเครื่อง ไม่ผ่าน bundler)

---

## ตั้งค่าครั้งแรก

ขั้นตอนด้านล่างทำคนละที่กัน:

| ทำที่ไหน | ขั้นตอน |
|---|---|
| เว็บคอนโซล (เบราว์เซอร์) | 1 Firebase · 6 Netlify · 7 LINE Developers |
| เครื่องคอมพิวเตอร์ของคุณ (terminal) | 2 ตั้ง `.env` · 3 deploy rules · 4 seed · 5 รัน dev server |

ข้อ 3 และ 4 รันบนเครื่องคุณ แต่ไปแก้ Firebase บนคลาวด์ — ต้องมีไฟล์ service account JSON
วางไว้ในโฟลเดอร์โปรเจกต์ก่อน (`.gitignore` กันไฟล์ชื่อ `serviceAccount*.json` ไว้แล้ว)

### 1. Firebase

สร้างโปรเจกต์ใหม่สำหรับ hub แล้วเปิด:

- **Authentication** → Sign-in method → เปิด **Email/Password** และ **Google**
- **Firestore Database** → สร้าง (production mode)
- **Storage** → สร้าง (ใช้เก็บโลโก้)
- **Project settings → Service accounts** → Generate new private key → ได้ไฟล์ JSON

ใน **Authentication → Settings → Authorized domains** ใส่โดเมนของ hub บน Netlify ด้วย
ไม่งั้น Google sign-in จะถูกปฏิเสธ

### 2. Environment variables

```bash
cp .env.example .env    # แล้วเติมค่า
```

`VITE_*` ถูกฝังตอน **build** — เปลี่ยนแล้วต้อง build ใหม่ ไม่ใช่แค่ redeploy
ส่วนที่เหลือเป็น secret ฝั่งเซิร์ฟเวอร์ **ห้ามใส่ prefix `VITE_`**

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `VITE_FIREBASE_*` | config ฝั่งเบราว์เซอร์ (public โดยธรรมชาติ — ความปลอดภัยมาจาก security rules) |
| `FIREBASE_SERVICE_ACCOUNT` | service account JSON ของ hub วางทั้งก้อนเป็นบรรทัดเดียว |
| `ADMIN_EMAILS` | อีเมลที่จะได้ claim `admin` ตอนล็อกอิน (คั่นด้วย comma) |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` / `LINE_LIFF_ID` | LINE Login channel + LIFF app |
| `FIREBASE_SA_TANTUN` ฯลฯ | service account ของแอปลูกแต่ละตัว เว้นว่างได้ถ้ายังไม่ต่อ |

### 3. Deploy security rules

```bash
npx firebase-tools deploy --only firestore:rules,storage --project <project-id>
```

หรือ copy เนื้อหา `firestore.rules` / `storage.rules` ไปวางในหน้า Rules ของ console

### 4. ใส่ข้อมูลตั้งต้น

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" npm run seed
```

จะสร้างรายการแอป 6 ตัวและ branding เริ่มต้น (รันซ้ำได้ เป็น merge ทั้งหมด)
จากนั้นแก้ URL / allow-list / กลุ่ม social–business ที่เหลือได้ในหน้า `/admin`

### 5. รัน dev server บนเครื่องคุณ (ไม่บังคับ)

ไว้ดูหน้าเว็บและทดสอบก่อนขึ้น Netlify — ข้ามไปข้อ 6 เลยก็ได้

```bash
npm install
npm run dev     # เปิด http://localhost:5173
```

ใน dev server นี้ LINE login จะยังไม่ทำงาน เพราะ LIFF ต้องเปิดจากในแอป LINE
และ Endpoint URL ต้องเป็น https — หน้า `/auth` (อีเมล/Google) ใช้ได้ตามปกติ

### 6. Deploy บน Netlify

ต่อ repo กับ Netlify — `netlify.toml` กำหนดไว้แล้ว build command `npm run build`,
publish `dist` ส่วน SSR handler ออกที่ `.netlify/functions-internal/server` ซึ่ง Netlify
หยิบไปเองอัตโนมัติ (`path: "/*"`, `preferStatic: true`)

ใส่ env vars ทุกตัวใน Site configuration → Environment variables แล้ว **trigger build ใหม่**
(ไม่ใช่ redeploy) เพราะ `VITE_*` ฝังตอน build

### 7. LINE Developers

- LIFF app → **Endpoint URL** = โดเมนของ hub (ปิดท้ายด้วย `/`), Size = Full
- Scope: `profile`, `openid`, `email`
- Channel status ต้องเป็น **Published** ไม่ใช่ Developing
- Rich menu ปุ่มที่ 1 → `https://liff.line.me/<LIFF_ID>`
  ปุ่มที่ 2 → `https://liff.line.me/<LIFF_ID>/business`

หน้า `/line-setup` ในแอปมีขั้นตอนละเอียดเป็นภาษาไทยทั้งหมด

---

## สิทธิ์ admin

Role เก็บเป็น **Firebase custom claim** ไม่ใช่ collection

- ล็อกอินด้วยอีเมลที่อยู่ใน `ADMIN_EMAILS` → ได้ claim อัตโนมัติ
- หรือสั่งตรง: `FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" npm run set-admin -- you@example.com`
  (เพิ่ม `--revoke` เพื่อถอน) — ผู้ใช้ต้องออกจากระบบแล้วเข้าใหม่ token ใบใหม่ถึงจะมี claim

---

## โครงสร้าง Firestore

| path | ใคร่เขียนได้ |
|---|---|
| `apps/{appId}` | อ่าน: ผู้ใช้ที่ล็อกอิน · เขียน: admin |
| `branding/singleton` | อ่าน: ทุกคน (แสดงบนหน้า login) · เขียน: admin |
| `profiles/{uid}` | อ่าน: เจ้าของ · เขียน: เซิร์ฟเวอร์เท่านั้น |
| `userAppPrefs/{uid}/apps/{appId}` | อ่าน/เขียน: เจ้าของ |
| `lineIndex/{lineUserId}` | เซิร์ฟเวอร์เท่านั้น (reverse lookup) |
| `ssoTickets/{ticketHash}` | เซิร์ฟเวอร์เท่านั้น |

ตั๋ว SSO ใช้ SHA-256 hash เป็น document id และ consume ด้วย conditional update
(`currentDocument.updateTime`) — ยิงพร้อมกันสองครั้งจะสำเร็จได้ครั้งเดียวเท่านั้น

แนะนำให้ตั้ง **TTL policy** บน `ssoTickets` ที่ฟิลด์ `expiresAt` ใน Firestore console
เพื่อให้ตั๋วหมดอายุถูกลบเอง (ไม่บังคับ — ตั๋วที่หมดอายุใช้ไม่ได้อยู่แล้ว)

---

## สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | build สำหรับ Netlify |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint + prettier |
| `npm run seed` | ใส่ข้อมูลแอป + branding ตั้งต้น |
| `npm run set-admin -- <email>` | ให้/ถอนสิทธิ์ admin |

---

## เช็กลิสต์ทดสอบก่อนขึ้นจริง

การเปิดเบราว์เซอร์ภายนอกจาก LINE ต่างกันระหว่าง iOS กับ Android — ต้องลองบนเครื่องจริงทั้งสอง

- [ ] iOS: rich menu ปุ่ม social → กดแอป → เปิดเบราว์เซอร์ภายนอก และ **หน้า LINE ยังอยู่ที่ Launcher**
- [ ] Android: เหมือนกัน (เคสนี้เคยพัง — `openExternalBrowser=1` ผสมกับ `liff.openWindow` แล้วหน้า LIFF ถูกพาไปด้วย)
- [ ] rich menu ปุ่ม business → เปิดแอปตรง ๆ ไม่มีตั๋ว SSO
- [ ] เปิด hub จากเบราว์เซอร์ปกติ → กดแอป → เปิด tab ใหม่ tab เดิมไม่ขยับ
- [ ] deep link `https://liff.line.me/<LIFF_ID>/business` ทั้งตอนมี session และไม่มี
- [ ] ตั๋วหมดอายุ (รอ > 60 วิ) → แอปลูกได้ `invalid_ticket`
- [ ] ใช้ตั๋วซ้ำ → ครั้งที่สองได้ `invalid_ticket`
- [ ] `return` URL นอก allow-list → ปฏิเสธ
- [ ] เข้าสู่ระบบด้วย Google ใน LINE in-app browser (ใช้ redirect flow ไม่ใช่ popup)
