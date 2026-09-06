# คู่มือสำหรับ AI ที่มาแก้โค้ดนี้

โปรเจกต์: **Aivora Hub** — LIFF launcher + SSO hub บน TanStack Start + Firebase + Netlify
อ่าน `README.md` ก่อนเพื่อเข้าใจภาพรวม ไฟล์นี้เก็บเฉพาะกับดักที่เคยทำให้พังมาแล้ว

## กฎที่ห้ามละเมิด

**1. ฝั่งเซิร์ฟเวอร์ห้าม import `firebase-admin`**
`firebase-admin/firestore` ดึง `@google-cloud/firestore` ซึ่งโหลดไฟล์ `.proto` ผ่าน
`__dirname` — bundle เข้า ESM serverless function แล้ว build ผ่าน แต่พังตอน runtime
ด้วย `__dirname is not defined in ES module scope`
ให้ใช้ REST helper ที่มีอยู่แทน: `src/integrations/firebase/{google-auth,identity,firestore}.server.ts`
(`firebase-admin` อยู่ใน devDependencies เพราะ `scripts/` ใช้ — รันบนเครื่อง ไม่ผ่าน bundler)

**2. ห้ามห่อ Firebase SDK object ด้วย Proxy หรือ wrapper**
`collection()`, `doc()`, `ref()` cast argument แรกด้วย `instanceof` — Proxy ผ่าน
property access ได้ แต่ prototype มาจาก target จึง `instanceof` เป็น false
อาการที่เกิด: **ล็อกอินได้ปกติ แต่ไม่มีข้อมูลโหลดเลย** (Auth ใช้ `getModularInstance`
ไม่ cast จึงทนได้) — เคยเกิดมาแล้วครั้งหนึ่ง
`src/integrations/firebase/client.ts` จึงสร้าง instance จริงเฉพาะฝั่งเบราว์เซอร์

**3. ห้ามใส่ prefix `VITE_` ให้ secret**
`VITE_*` ถูก Vite ฝังลง bundle ของเบราว์เซอร์ ใครก็อ่านได้
service account และ LINE secret อ่านผ่าน `process.env` ฝั่งเซิร์ฟเวอร์เท่านั้น

**4. ห้ามแตะ `.env` และห้าม commit ไฟล์ service account**
`.gitignore` กันไว้แล้ว ถ้าต้องเพิ่มตัวแปรใหม่ ให้เพิ่มใน `.env.example` (ค่าว่าง) แทน

**5. ห้ามเปลี่ยน response shape ของ `/api/public/sso/exchange`**
แอปลูก 5 ตัวเรียก endpoint นี้อยู่ ต้องคืน
`{ user: { id, display_name, avatar_url, email, roles }, app_slug, firebase }` เหมือนเดิม
(ชื่อ field เป็น snake_case ตรงนี้จุดเดียว ที่อื่นในโค้ดใช้ camelCase)

**6. ห้ามแก้ `src/lib/open-external.ts` โดยไม่ทดสอบบนมือถือจริง**
มันแก้บั๊กที่ Android LINE เปิดเบราว์เซอร์ภายนอก **แล้วพาหน้า LIFF ไปด้วย** ตอน
ผสม `openExternalBrowser=1` เข้ากับ `liff.openWindow({ external: true })`
คอมเมนต์ในไฟล์อธิบายไว้แล้ว — อย่า "ทำให้เรียบร้อยขึ้น"

## โครงสร้างที่ควรรู้

| ที่อยู่ | หน้าที่ |
|---|---|
| `src/integrations/firebase/client.ts` | Firebase ฝั่งเบราว์เซอร์ (client-only) |
| `src/integrations/firebase/*.server.ts` | REST helper ฝั่งเซิร์ฟเวอร์ — bypass security rules |
| `src/integrations/firebase/schema.ts` | ชื่อ collection + type ใช้ร่วมกันสองฝั่ง |
| `src/lib/hub-data.ts` | ทุก query ของ Firestore ฝั่ง client รวมอยู่ที่นี่ |
| `firestore.rules` / `storage.rules` | แก้ที่นี่แล้วต้อง deploy แยก ไม่ได้ไปกับ Netlify |

- Role เป็น **Firebase custom claim** (`admin`) ไม่ใช่ collection
- route ที่แตะ Firebase ตั้ง `ssr: false` แต่ module ยัง evaluate ตอน SSR อยู่ดี
- module ที่ลงท้าย `.server.ts` ห้าม import จาก route file หรือ `*.functions.ts` แบบ top-level
  ให้ `await import()` ข้างใน handler (ทั้งสองไฟล์นั้นถูกส่งไป client bundle ด้วย)

## ก่อนรายงานว่าเสร็จ ต้องรันให้ผ่านทั้งสามอย่าง

```bash
npm run typecheck
npm run lint
npm run build
```

ถ้าแตะโค้ดฝั่งเซิร์ฟเวอร์ ให้รัน handler ที่ build แล้วด้วย เพื่อจับปัญหาแบบ bundling
ที่ typecheck มองไม่เห็น:

```js
// node probe.mjs — ต้องได้ 200 ไม่ใช่ 500 error page
const { default: handler } = await import("./.netlify/functions-internal/server/main.mjs");
const res = await handler(new Request("http://localhost/auth"));
console.log(res.status);
```

## รูปแบบการรายงาน

จบงานแล้วให้สรุปเป็นข้อความเดียว ประกอบด้วย:

1. **สาเหตุที่แท้จริง** ของแต่ละปัญหา ไม่ใช่แค่ "แก้แล้ว"
2. `git diff --stat` และ diff เต็มของไฟล์ที่แก้ตรรกะ (ข้ามไฟล์ format ล้วน)
3. ผลของทั้งสามคำสั่งด้านบน (คัดลอกบรรทัดสรุปมา)
4. **สิ่งที่ยังไม่ได้ทดสอบ** และต้องให้คนทดสอบบนมือถือ/เบราว์เซอร์จริง
5. อะไรที่เจอระหว่างทางแต่ไม่ได้แก้ (พร้อมเหตุผล)

ถ้าไม่แน่ใจว่าสาเหตุคืออะไร **ให้พิสูจน์ก่อนแก้** — เขียนสคริปต์เล็ก ๆ ทดสอบสมมติฐาน
แล้วรายงานผล ดีกว่าเดาแล้วแก้หลายจุดพร้อมกัน

## Git

- ทำงานบน branch ใหม่เสมอ อย่า commit ตรงเข้า `main`
- commit message เขียนว่า *ทำไม* ไม่ใช่ *อะไร* — โค้ดบอก "อะไร" อยู่แล้ว
- อย่า push จนกว่าจะได้รับอนุมัติ
