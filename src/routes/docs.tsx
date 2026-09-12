import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "คู่มือเชื่อมต่อ SSO สำหรับแอปลูก — Aivora" },
      {
        name: "description",
        content:
          "ขั้นตอนและตัวอย่างโค้ดสำหรับให้เว็บแอปของคุณล็อกอินผ่าน Aivora SSO hub ด้วยตั๋วใช้ครั้งเดียว",
      },
      { property: "og:title", content: "คู่มือเชื่อมต่อ SSO สำหรับแอปลูก — Aivora" },
      {
        property: "og:description",
        content: "ขั้นตอนและตัวอย่างโค้ดสำหรับให้เว็บแอปของคุณล็อกอินผ่าน Aivora SSO hub",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocsPage,
});

const REDIRECT_SNIPPET = (hub: string) => `// 1) ในแอปลูก: ถ้ายังไม่มี session ให้ส่งผู้ใช้ไปที่ hub
const HUB = "${hub}";
const back = window.location.origin + "/sso/callback";
window.location.href =
  \`\${HUB}/sso/authorize?app=<app-slug>&return=\${encodeURIComponent(back)}\`;`;

const EXCHANGE_SNIPPET = (
  hub: string,
) => `// 2) ที่ /sso/callback ของแอปลูก: ส่ง ticket ไปแลกฝั่งเซิร์ฟเวอร์ (Netlify function)
const ticket = new URLSearchParams(location.search).get("sso_ticket");
const res = await fetch("/.netlify/functions/sso-exchange", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ticket }),
});
const { user } = await res.json();
// user = { id, display_name, avatar_url, email, roles: [...] }`;

const FUNCTION_SNIPPET = (
  hub: string,
) => `// netlify/functions/sso-exchange.js — แลกตั๋วฝั่งเซิร์ฟเวอร์เท่านั้น
export async function handler(event) {
  const { ticket } = JSON.parse(event.body || "{}");
  const res = await fetch("${hub}/api/public/sso/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket }),
  });
  const data = await res.json();
  if (!res.ok) return { statusCode: res.status, body: JSON.stringify(data) };

  // ทางเลือก A (แนะนำ): ออก Firebase custom token ให้ uid = data.user.id
  // แล้วฝั่ง client เรียก signInWithCustomToken() โค้ด Firebase เดิมใช้ต่อได้ทั้งหมด
  return { statusCode: 200, body: JSON.stringify(data) };
}`;

const SOCIAL_APP_PROMPT = (
  hub: string,
) => `แอปนี้เป็นแอปลูกฝั่ง Social ของ Aivora Hub ต้องรองรับการล็อกอินผ่าน SSO ของ hub
prompt นี้ผ่านการใช้งานจริงกับแอปลูกตัวแรกมาแล้ว กับดักทุกข้อในนี้เคยทำให้พังมาจริง
ห้ามข้าม แม้จะดูเหมือนไม่เกี่ยวกับแอปนี้

ค่าคงที่ที่ต้องแก้ก่อนใช้:
- HUB_URL   = ${hub}
- APP_SLUG  = <slug ของแอปนี้ ต้องตรงกับที่ตั้งไว้ในหน้าจัดการ Launcher ของ hub>
- CALLBACK  = <origin ของแอปนี้>/sso/callback  (ต้องอยู่ใน allow-list ที่ hub แล้ว)

หลักการที่ห้ามละเมิด:
- ห้ามลบหรือแก้ระบบล็อกอินเดิมของแอป (anonymous / Google / email) SSO เป็นทางเลือกเพิ่ม
- ห้ามแลกตั๋วจากโค้ดฝั่งเบราว์เซอร์ ต้องผ่าน serverless function ของแอปนี้เท่านั้น
- ห้ามเก็บ service account key ในแอปลูก hub เซ็น custom token ให้แล้ว
- ผู้ใช้ที่มาทาง SSO ต้องได้สิทธิ์เท่าผู้ใช้ทั่วไป ห้ามรับ role จาก hub มาใช้

=== ขั้นที่ 1 — asset path ต้องเป็น absolute ===

กับดักข้อนี้ทำให้หน้า /sso/callback ขึ้นมาแบบไม่มี CSS และ JS ไม่ทำงานเลย
สาเหตุ: index.html อ้าง asset แบบ relative (เช่น "styles.css" หรือ "./app.js")
พออยู่ที่ route ซ้อนชั้น /sso/callback เบราว์เซอร์ไปขอที่ /sso/styles.css ซึ่งไม่มีจริง
แล้ว SPA fallback คืน index.html กลับมาเป็น 200 เบราว์เซอร์ปฏิเสธเพราะ MIME ไม่ตรง
อาการหลอกตามาก เพราะหน้าแรก / ใช้งานได้ปกติ

- แก้ asset reference ทุกตัวใน index.html ให้ขึ้นต้นด้วย "/" (css, js, favicon, manifest, รูป, ฟอนต์)
- ถ้าใช้ bundler ให้ตั้ง base / publicPath เป็น "/"
- ยืนยันหลัง deploy:
    curl -sI https://<โดเมน>/styles.css | grep -i content-type   ต้องเป็น text/css
    curl -sI https://<โดเมน>/app.js     | grep -i content-type   ต้องเป็น javascript
  ถ้าได้ text/html แปลว่ายังไม่ผ่าน

=== ขั้นที่ 2 — serverless function แลกตั๋ว ===

สร้าง function (เช่น Netlify function ชื่อ sso-exchange) รับ POST { ticket } แล้ว:

1. POST { ticket } ไปที่ ${hub}/api/public/sso/exchange
2. hub ตอบกลับเป็น
   {
     "user": { "id", "display_name", "avatar_url", "email", "roles" },
     "app_slug": "<slug>",
     "firebase": { "custom_token", "project_id" }   // เป็น null ได้
   }
3. ตรวจ app_slug ตรงกับ APP_SLUG ไม่ตรงให้ปฏิเสธ
4. ถ้า firebase เป็น null แปลว่าแอปนี้ยังไม่ได้ตั้ง service account ที่ hub
   ให้คืน error ที่อ่านรู้เรื่อง อย่าปล่อยหน้าขาว
5. ตรวจ firebase.project_id ตรงกับ projectId ของ Firebase แอปนี้ ไม่ตรงให้ปฏิเสธ
6. decode payload ของ custom_token (decode เฉย ๆ ไม่ต้อง verify — เราไม่มีคีย์)
   แล้วตรวจว่า uid ขึ้นต้นด้วย "aivora:" ไม่ใช่ให้ปฏิเสธ
   ด่านนี้สำคัญ: uid ที่ Firebase สร้างเองไม่มีวันขึ้นต้นด้วย aivora: การตรวจ prefix
   จึงกันไม่ให้ token จาก hub ไปทับบัญชีที่ผู้ใช้สมัครเองในแอปนี้
7. คืน custom_token + ข้อมูลโปรไฟล์ให้ client

กับดัก 2 ข้อในขั้นนี้ที่เคยทำให้เสียเวลาหลายรอบ:

(ก) การตรวจรูปร่าง payload ต้องรับค่า null
    hub คืน null (ไม่ใช่ undefined) สำหรับ display_name / email / avatar_url ที่ไม่มีค่า
    ผู้ใช้ที่ล็อกอินผ่าน LINE มักไม่มีอีเมล ถ้าเช็คด้วย typeof === 'string' อย่างเดียว
    จะตกทันที ใช้ (v == null || typeof v === 'string') แทน
    ส่วน user.id ยังต้องเป็น string ที่ไม่ว่าง ห้ามผ่อน

(ข) log ทุก error รวมทั้ง error ที่เราตั้งใจโยนเอง
    ถ้ากลืน error ของตัวเองไว้ log ฝั่งเซิร์ฟเวอร์จะว่างเปล่า แล้วเวลามีปัญหาจะแยกไม่ออก
    ว่า function crash หรือปฏิเสธอย่างตั้งใจ ให้ log code + message เสมอ (ห้าม log ตัว token)
    และอย่า map ทุก error เป็น 502 — 502 ทำให้เข้าใจผิดว่า function พัง
    ใช้ 401 สำหรับตั๋วไม่ถูกต้อง, 403 สำหรับ slug/project ไม่ตรง,
    409 สำหรับยังไม่ได้ตั้ง service account, 502 เฉพาะตอน hub ติดต่อไม่ได้จริง

=== ขั้นที่ 3 — หน้า /sso/callback ===

1. อ่าน query param "sso_ticket"
2. **ลบ sso_ticket ออกจาก URL ทันทีด้วย history.replaceState ก่อน await ตัวแรก**
   ตั๋วใช้ได้ครั้งเดียว อายุ 60 วินาที ถ้าผู้ใช้กด refresh จะได้ invalid_ticket
   แล้วเข้าใจผิดว่าระบบพัง
3. ส่ง ticket ไปแลกที่ function ของขั้นที่ 2
4. เก็บ custom_token ที่ได้ไว้ในตัวแปรใน memory
   ถ้าขั้นตอนถัดไปล้มแล้วต้อง retry ให้ retry เฉพาะ signInWithCustomToken
   **ห้ามวนกลับไปแลกตั๋วใหม่** เพราะตั๋วถูกใช้ไปแล้ว
5. เรียก signInWithCustomToken(auth, custom_token)

=== ขั้นที่ 4 — หลัง sign-in ต้องเรียก bootstrap เอง (ข้อที่พลาดกันมากที่สุด) ===

แอปส่วนใหญ่ผูกการโหลดข้อมูลหลังล็อกอินไว้กับ onAuthStateChanged
เส้นทาง SSO **ห้ามพึ่ง listener ตัวนั้น** เพราะลำดับการยิงระหว่าง promise ของ
signInWithCustomToken กับ listener ไม่มีการการันตี ถ้า listener ยิงก่อน await resolve
มันมักโดน guard ของ flow SSO บล็อกไปเงียบ ๆ แล้วไม่มีอะไรยิงซ้ำอีก
อาการที่ได้คือ: ล็อกอินสำเร็จจริง (มี user ใน Firebase Auth) แต่หน้าจอหมุนค้างตลอดไป
ไม่มี error ใน console และ **ไม่มี request ไป Firestore เลยแม้แต่ครั้งเดียว**

วิธีแก้:
- แยกฟังก์ชัน bootstrap ตัวจริง (โหลด/สร้างโปรไฟล์ + โหลดข้อมูล + แสดงหน้าแรก)
  ออกจาก wrapper ที่มี guard สำหรับ listener
- เส้นทาง SSO เรียก bootstrap ตัวจริง **ตรง ๆ** หลัง sign-in สำเร็จ
- คง flag ที่กัน listener ไว้เป็น true ตลอดช่วงที่เรียก bootstrap แบบ explicit
  เพื่อไม่ให้ทำงานซ้อนกัน
- ผู้ใช้ใหม่ต้องถูกสร้างโปรไฟล์ตามสคีมาเดิมของแอปทุกฟิลด์ โดยเติมค่าจาก hub
  (display_name / email / avatar_url) และ role ต้องเป็นค่าเริ่มต้นของผู้ใช้ทั่วไปเสมอ
- ผู้ใช้เดิมอย่าเขียนทับข้อมูลที่เขาแก้ไว้เอง เติมเฉพาะฟิลด์ที่ว่าง
- **ห้ามเขียน bootstrap ขึ้นมาใหม่คนละชุดสำหรับ SSO** ให้เรียกตัวเดิม ถ้าจำเป็นก็เพิ่มพารามิเตอร์
  สองเส้นทางที่แยกกันจะเพี้ยนออกจากกันในภายหลังแน่นอน

=== ขั้นที่ 5 — auth persistence ===

ตั้ง setPersistence(auth, browserLocalPersistence) ก่อนการ sign-in ทุกเส้นทาง
ค่าเริ่มต้นของ Firebase ใช้ IndexedDB ซึ่งพังได้ในแอปที่มี service worker
ด้วย error "Database is closing/hidden" แล้วล็อกอินไม่สำเร็จทั้งที่โค้ดถูกทุกอย่าง
localStorage ไม่มีปัญหานี้ ผลข้างเคียงคือผู้ใช้ที่มี session เดิมใน IndexedDB
ต้องล็อกอินใหม่หนึ่งครั้ง

=== ขั้นที่ 6 — ห้ามหมุนค้างเงียบ ๆ ===

ทุกข้อข้างบนที่เคยพัง ใช้เวลาหาสาเหตุนานเกินจำเป็นเพราะหน้าจอบอกแค่ "กำลังโหลด"

- ครอบ flow ตั้งแต่แลกตั๋วจนถึง bootstrap ด้วย try/catch แสดงข้อความจริง + ปุ่มลองใหม่
  ที่พากลับไปหน้า login เดิม
- ตั้ง timeout ~15 วินาที ถ้ายังไม่จบให้แสดงข้อความ ไม่หมุนต่อ
- ใส่ console.info ตาม checkpoint สำคัญ อย่างน้อย 6 จุด:
  พบตั๋ว / แลกตั๋วสำเร็จ / sign-in สำเร็จพร้อม uid / เริ่ม bootstrap /
  โปรไฟล์พร้อม / bootstrap เสร็จ
  จุดนี้ทำให้ครั้งหน้าดู console แล้วรู้ทันทีว่าค้างที่ขั้นไหน

=== ขั้นที่ 7 — ปุ่มบนหน้า login ===

เพิ่มปุ่ม "เข้าสู่ระบบด้วย LINE (Aivora)" ไปที่
${hub}/sso/authorize?app=<APP_SLUG>&return=<CALLBACK ที่ encodeURIComponent แล้ว>

=== ทดสอบก่อนบอกว่าเสร็จ ===

ต้องผ่านครบทั้ง 3 เส้นทาง โดยเปิด DevTools Console ไว้ตลอด:
1. ล็อกอินเดิมของแอป (anonymous / Google / email) ต้องทำงานเหมือนเดิมทุกประการ
2. SSO จาก Launcher ในเบราว์เซอร์ปกติ
3. SSO จาก Launcher ที่เปิดใน LINE

เกณฑ์ผ่าน: ไม่หมุนค้าง เข้าหน้าแรกได้, มีเอกสารโปรไฟล์ของ uid aivora:... เกิดขึ้นใน
ฐานข้อมูล, console ไม่มี error (CSP ที่บ่นเรื่อง .js.map ของ Firebase SDK ไม่ต้องสนใจ
เป็น sourcemap ไม่กระทบการทำงาน)

การแลกตั๋วจริงต้องกดจากหน้า Launcher เท่านั้น จำลองเองไม่ได้เพราะตั๋วอายุ 60 วินาที
ใช้ครั้งเดียว — รายงานมาด้วยว่าอะไรที่ยังไม่ได้ทดสอบและต้องให้คนทดสอบ`;

const SUPABASE_APP_PROMPT = (
  hub: string,
) => `แอปนี้เป็นแอปลูกฝั่ง Social ของ Aivora Hub และใช้ Supabase เป็นฐานข้อมูลกับระบบ auth
ต้องรองรับการล็อกอินผ่าน SSO ของ hub
prompt นี้ต่อยอดจากเวอร์ชัน Firebase ที่ผ่านการใช้งานจริงมาแล้ว กับดักทุกข้อในนี้
เคยทำให้พังมาจริง ห้ามข้าม แม้จะดูเหมือนไม่เกี่ยวกับแอปนี้

ค่าคงที่ที่ต้องแก้ก่อนใช้:
- HUB_URL   = ${hub}
- APP_SLUG  = <slug ของแอปนี้ ต้องตรงกับที่ตั้งไว้ในหน้าจัดการ Launcher ของ hub>
- CALLBACK  = <origin ของแอปนี้>/sso/callback  (ต้องอยู่ใน allow-list ที่ hub แล้ว)

ค่าที่ต้องตั้งเป็น environment variable ที่ Netlify ของ **แอปนี้** (ไม่ใช่ที่ hub):
- SUPABASE_URL          = https://<project-ref>.supabase.co
- SUPABASE_SERVICE_ROLE = service_role key (Settings > API ของโปรเจกต์นี้)

หลักการที่ห้ามละเมิด:
- ห้ามลบหรือแก้ระบบล็อกอินเดิมของแอป SSO เป็นทางเลือกเพิ่ม ไม่ใช่ตัวแทน
- service_role bypass RLS ทั้งหมด ห้ามใส่ prefix ที่ทำให้มันหลุดไป client
  (ห้าม VITE_ / NEXT_PUBLIC_ / PUBLIC_) ใช้ได้เฉพาะใน serverless function เท่านั้น
- ห้ามแลกตั๋วจากโค้ดฝั่งเบราว์เซอร์
- ผู้ใช้ที่มาทาง SSO ต้องได้สิทธิ์เท่าผู้ใช้ทั่วไป ห้ามรับ roles จาก hub มาใช้กำหนดสิทธิ์

=== ขั้นที่ 1 — asset path ต้องเป็น absolute ===

กับดักข้อนี้ทำให้หน้า /sso/callback ขึ้นมาแบบไม่มี CSS และ JS ไม่ทำงานเลย
สาเหตุ: index.html อ้าง asset แบบ relative (เช่น "styles.css" หรือ "./app.js")
พออยู่ที่ route ซ้อนชั้น /sso/callback เบราว์เซอร์ไปขอที่ /sso/styles.css ซึ่งไม่มีจริง
แล้ว SPA fallback คืน index.html กลับมาเป็น 200 เบราว์เซอร์ปฏิเสธเพราะ MIME ไม่ตรง
อาการหลอกตามาก เพราะหน้าแรก / ใช้งานได้ปกติ

- แก้ asset reference ทุกตัวใน index.html ให้ขึ้นต้นด้วย "/" (css, js, favicon, manifest, รูป, ฟอนต์)
- ถ้าใช้ bundler ให้ตั้ง base / publicPath เป็น "/"
- ยืนยันหลัง deploy:
    curl -sI https://<โดเมน>/styles.css | grep -i content-type   ต้องเป็น text/css
    curl -sI https://<โดเมน>/app.js     | grep -i content-type   ต้องเป็น javascript
  ถ้าได้ text/html แปลว่ายังไม่ผ่าน

=== ขั้นที่ 2 — serverless function แลกตั๋วและออก session ===

สร้าง function (เช่น Netlify function ชื่อ sso-exchange) รับ POST { ticket } แล้ว:

1. POST { ticket } ไปที่ ${hub}/api/public/sso/exchange
2. hub ตอบกลับเป็น
   {
     "user": { "id", "display_name", "avatar_url", "email", "roles" },
     "app_slug": "<slug>",
     "firebase": null
   }
   แอปที่ใช้ Supabase จะได้ firebase เป็น null เสมอ ซึ่งถูกต้องแล้ว ไม่ใช่ error
   ห้ามโยน error เพราะ firebase เป็น null
3. ตรวจ app_slug ตรงกับ APP_SLUG ไม่ตรงให้ปฏิเสธ
4. การตรวจรูปร่าง payload ต้องรับค่า null ได้
   hub คืน null (ไม่ใช่ undefined) สำหรับ display_name / email / avatar_url ที่ไม่มีค่า
   ผู้ใช้ที่ล็อกอินผ่าน LINE มักไม่มีอีเมล ถ้าเช็คด้วย typeof === 'string' อย่างเดียวจะตกทันที
   ใช้ (v == null || typeof v === 'string') แทน
   ส่วน user.id ยังต้องเป็น string ที่ไม่ว่าง ห้ามผ่อน
5. สร้าง client ด้วย service_role:
   createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
6. **หาผู้ใช้ด้วย aivora_user_id ไม่ใช่ด้วยอีเมล** (อธิบายเหตุผลในหัวข้อถัดไป)
   เก็บ user.id ของ hub ไว้ใน app_metadata.aivora_user_id ตั้งแต่ตอนสร้าง
   วิธีค้น: ถ้าจำนวนผู้ใช้ยังน้อยใช้ auth.admin.listUsers แล้วกรองก็พอ
   ถ้าจะให้ดีในระยะยาว ให้มีตาราง aivora_links (aivora_user_id text primary key,
   user_id uuid references auth.users) แล้ว query ตรง ๆ
7. ไม่เจอ -> auth.admin.createUser({
     email: <อีเมลจาก hub ถ้ามี ไม่มีให้ใช้ aivora+<user.id>@<โดเมนของแอปนี้>>,
     email_confirm: true,
     app_metadata: { aivora_user_id: <user.id จาก hub>, provider: 'aivora' },
     user_metadata: { display_name, avatar_url }
   })
   แล้วบันทึกลง aivora_links ถ้าใช้ตาราง
8. ออก session:
     const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
     const { data: session } = await admin.auth.verifyOtp({
       type: 'magiclink', token_hash: data.properties.hashed_token
     })
   จะได้ session.access_token และ session.refresh_token
9. คืน { access_token, refresh_token, profile } ให้ client
   ห้ามคืน service_role หรือข้อมูลอื่นที่ client ไม่จำเป็นต้องรู้

กับดักเรื่อง log ที่ต้องทำตั้งแต่แรก:
log ทุก error รวมทั้ง error ที่เราตั้งใจโยนเอง (log code + message ห้าม log token หรือ key)
ถ้ากลืน error ของตัวเองไว้ log ฝั่งเซิร์ฟเวอร์จะว่างเปล่า แล้วเวลามีปัญหาจะแยกไม่ออกว่า
function crash หรือปฏิเสธอย่างตั้งใจ
และอย่า map ทุก error เป็น 502 — 502 ทำให้เข้าใจผิดว่า function พัง
ใช้ 401 สำหรับตั๋วไม่ถูกต้อง, 403 สำหรับ slug ไม่ตรง, 502 เฉพาะตอน hub ติดต่อไม่ได้จริง

=== ขั้นที่ 3 — ห้ามผูกบัญชีด้วยอีเมลอย่างเดียว (ข้อสำคัญที่สุดด้านความปลอดภัย) ===

ในเวอร์ชัน Firebase มีด่านตรวจว่า uid ใน custom token ขึ้นต้นด้วย "aivora:" ซึ่งกันไม่ให้
token จาก hub ไปทับบัญชีที่ผู้ใช้สมัครเองในแอปลูก Supabase ไม่มีกลไกนั้น เราต้องสร้างเอง

- หาและผูกบัญชีด้วย app_metadata.aivora_user_id เท่านั้น
- ห้ามใช้ลำดับ "หา user จากอีเมลที่ hub ส่งมา เจอแล้วออก session ให้เลย"
  เพราะถ้ามีคนสมัครบัญชีในแอปนี้ด้วยอีเมลเดียวกันไว้ก่อน การออก session ให้เท่ากับ
  ยกบัญชีนั้นให้ไปเลย และ hub ไม่ได้บอกมาว่าอีเมลนั้นผ่านการยืนยันหรือยัง
- ถ้าอยากให้ผู้ใช้เชื่อมสองบัญชีเข้าด้วยกันจริง ๆ ให้ทำเป็นฟีเจอร์แยกในหน้าตั้งค่า
  ที่ผู้ใช้ต้องล็อกอินบัญชีเดิมอยู่แล้วถึงจะกดเชื่อมได้ ไม่ใช่ทำเงียบ ๆ ตอน SSO

=== ขั้นที่ 4 — หน้า /sso/callback ===

1. อ่าน query param "sso_ticket"
2. **ลบ sso_ticket ออกจาก URL ทันทีด้วย history.replaceState ก่อน await ตัวแรก**
   ตั๋วใช้ได้ครั้งเดียว อายุ 60 วินาที ถ้าผู้ใช้กด refresh จะได้ invalid_ticket
   แล้วเข้าใจผิดว่าระบบพัง
3. ส่ง ticket ไปแลกที่ function ของขั้นที่ 2
4. เก็บ tokens ที่ได้ไว้ในตัวแปรใน memory
   ถ้าขั้นตอนถัดไปล้มแล้วต้อง retry ให้ retry เฉพาะ setSession
   **ห้ามวนกลับไปแลกตั๋วใหม่** เพราะตั๋วถูกใช้ไปแล้ว
5. เรียก supabase.auth.setSession({ access_token, refresh_token })

=== ขั้นที่ 5 — หลัง setSession ต้องเรียก bootstrap เอง (ข้อที่พลาดกันมากที่สุด) ===

แอปส่วนใหญ่ผูกการโหลดข้อมูลหลังล็อกอินไว้กับ supabase.auth.onAuthStateChange
เส้นทาง SSO **ห้ามพึ่ง listener ตัวนั้น** เพราะลำดับการยิงระหว่าง promise ของ setSession
กับ listener ไม่มีการการันตี ถ้า listener ยิงก่อน await resolve มันมักโดน guard ของ
flow SSO บล็อกไปเงียบ ๆ แล้วไม่มีอะไรยิงซ้ำอีก
อาการที่ได้คือ: ล็อกอินสำเร็จจริง (มี session จริง) แต่หน้าจอหมุนค้างตลอดไป
ไม่มี error ใน console และ **ไม่มี request ไปฐานข้อมูลเลยแม้แต่ครั้งเดียว**
ข้อนี้เคยเกิดจริงกับแอปลูกตัวแรก ใช้เวลาหาสาเหตุนานที่สุดในบรรดาทุกข้อ

วิธีแก้:
- แยกฟังก์ชัน bootstrap ตัวจริง (โหลด/สร้างโปรไฟล์ + โหลดข้อมูล + แสดงหน้าแรก)
  ออกจาก wrapper ที่มี guard สำหรับ listener
- เส้นทาง SSO เรียก bootstrap ตัวจริง **ตรง ๆ** หลัง setSession สำเร็จ
- คง flag ที่กัน listener ไว้เป็น true ตลอดช่วงที่เรียก bootstrap แบบ explicit
- ผู้ใช้ใหม่ต้องถูกสร้างแถวในตาราง profiles ตามสคีมาเดิมของแอปทุกคอลัมน์
  โดยเติมค่าจาก hub (display_name / email / avatar_url) และ role ต้องเป็นค่าเริ่มต้นเสมอ
- ผู้ใช้เดิมอย่าเขียนทับข้อมูลที่เขาแก้ไว้เอง เติมเฉพาะคอลัมน์ที่ว่าง
- **ห้ามเขียน bootstrap ขึ้นมาใหม่คนละชุดสำหรับ SSO** ให้เรียกตัวเดิม ถ้าจำเป็นก็เพิ่มพารามิเตอร์
  สองเส้นทางที่แยกกันจะเพี้ยนออกจากกันในภายหลังแน่นอน

=== ขั้นที่ 6 — RLS ต้องรองรับผู้ใช้ที่มาทาง SSO ===

ผู้ใช้ที่สร้างจาก SSO เป็น auth.users ปกติทุกอย่าง policy ที่อิง auth.uid() จึงใช้ได้เลย
แต่ต้องตรวจสองอย่าง:
- ถ้ามี policy ไหนอิง provider หรือ email domain ให้เช็คว่าไม่ได้กันผู้ใช้กลุ่มนี้ออกไป
- ถ้าใช้อีเมลสังเคราะห์ aivora+<id>@... ต้องไม่มี policy หรือ trigger ไหนปฏิเสธรูปแบบนั้น
ทดสอบด้วยผู้ใช้ที่มาจาก SSO จริง ไม่ใช่แค่ผู้ใช้ที่สมัครเอง

=== ขั้นที่ 7 — ห้ามหมุนค้างเงียบ ๆ ===

ทุกข้อข้างบนที่เคยพัง ใช้เวลาหาสาเหตุนานเกินจำเป็นเพราะหน้าจอบอกแค่ "กำลังโหลด"

- ครอบ flow ตั้งแต่แลกตั๋วจนถึง bootstrap ด้วย try/catch แสดงข้อความจริง + ปุ่มลองใหม่
  ที่พากลับไปหน้า login เดิม
- ตั้ง timeout ~15 วินาที ถ้ายังไม่จบให้แสดงข้อความ ไม่หมุนต่อ
- ใส่ console.info ตาม checkpoint สำคัญ อย่างน้อย 6 จุด:
  พบตั๋ว / แลกตั๋วสำเร็จ / setSession สำเร็จพร้อม user id / เริ่ม bootstrap /
  โปรไฟล์พร้อม / bootstrap เสร็จ
  จุดนี้ทำให้ครั้งหน้าดู console แล้วรู้ทันทีว่าค้างที่ขั้นไหน

=== ขั้นที่ 8 — ปุ่มบนหน้า login ===

เพิ่มปุ่ม "เข้าสู่ระบบด้วย LINE (Aivora)" ไปที่
${hub}/sso/authorize?app=<APP_SLUG>&return=<CALLBACK ที่ encodeURIComponent แล้ว>

=== ทดสอบก่อนบอกว่าเสร็จ ===

ต้องผ่านครบทั้ง 3 เส้นทาง โดยเปิด DevTools Console ไว้ตลอด:
1. ล็อกอินเดิมของแอป ต้องทำงานเหมือนเดิมทุกประการ
2. SSO จาก Launcher ในเบราว์เซอร์ปกติ
3. SSO จาก Launcher ที่เปิดใน LINE

เกณฑ์ผ่าน: ไม่หมุนค้าง เข้าหน้าแรกได้, มีแถวใน auth.users ที่ app_metadata.aivora_user_id
ตรงกับ user.id ของ hub, มีแถวโปรไฟล์ของผู้ใช้คนนั้น, และ console ไม่มี error

ยืนยันด้วยว่า service_role ไม่หลุดไป client:
  grep -ri "service_role\\|SUPABASE_SERVICE" <โฟลเดอร์ build output>/
ต้องไม่เจออะไรเลย

การแลกตั๋วจริงต้องกดจากหน้า Launcher เท่านั้น จำลองเองไม่ได้เพราะตั๋วอายุ 60 วินาที
ใช้ครั้งเดียว — รายงานมาด้วยว่าอะไรที่ยังไม่ได้ทดสอบและต้องให้คนทดสอบ`;

function Snippet({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-background/70 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocsPage() {
  // Always show the origin this hub is actually served from, so the snippets
  // stay correct across preview deploys and a later custom domain.
  const hub = typeof window === "undefined" ? "https://<your-hub-domain>" : window.location.origin;
  const navigate = useNavigate();
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-16 pt-8">
      <button
        onClick={() => navigate({ to: "/settings" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> กลับหน้าตั้งค่า
      </button>

      <h1 className="mt-6 text-2xl font-semibold">คู่มือเชื่อมต่อ SSO</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        เว็บแอปของคุณไม่ต้องมีหน้าล็อกอินของตัวเองอีก ให้ส่งผู้ใช้มาที่ Aivora แล้วรับ
        “ตั๋วใช้ครั้งเดียว” กลับไปแลกเป็นข้อมูลผู้ใช้กลางฝั่งเซิร์ฟเวอร์
      </p>

      <section className="mt-6 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">ก่อนเริ่ม</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>เพิ่มแอปในหน้า Launcher (แอดมิน) พร้อมกำหนด slug และ URL จริง</li>
          <li>
            ใส่ URL ปลายทางของแอปลูกใน allow-list (เช่น{" "}
            <span className="font-mono text-xs">https://myapp.netlify.app/sso/callback</span>)
            ไม่อยู่ใน allow-list จะออกตั๋วไม่ได้
          </li>
          <li>ตั๋วมีอายุ 60 วินาที ใช้ได้ครั้งเดียว และผูกกับแอปที่ขอ</li>
        </ol>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">ขั้นตอนการเชื่อมต่อ</h2>
        <Snippet title="1. ส่งผู้ใช้ไปยัง Aivora" code={REDIRECT_SNIPPET(hub)} />
        <Snippet title="2. รับตั๋วที่หน้า callback" code={EXCHANGE_SNIPPET(hub)} />
        <Snippet title="3. แลกตั๋วฝั่งเซิร์ฟเวอร์" code={FUNCTION_SNIPPET(hub)} />
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          สำคัญ: ห้ามแลกตั๋วจากฝั่งเบราว์เซอร์โดยตรงในโปรดักชัน ให้ทำผ่านฟังก์ชันเซิร์ฟเวอร์
          เพื่อไม่ให้ตั๋วและข้อมูลผู้ใช้รั่วไปอยู่ในโค้ดหน้าเว็บ
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          ถ้าหน้า <span className="font-mono">/sso/callback</span> ของแอปลูกขึ้นมาแบบไม่มี CSS
          แปลว่าแอปนั้น build ด้วย asset path แบบ relative — ที่ route
          ซ้อนชั้นเบราว์เซอร์จะไปขอไฟล์ที่ <span className="font-mono">/sso/assets/...</span> แล้ว
          404 ทั้ง CSS และ JS ที่ใช้แลกตั๋ว แก้ที่แอปลูกด้วย{" "}
          <span className="font-mono">base: &quot;/&quot;</span> ใน vite config
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">Firebase custom token</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          hub ไม่ได้เก็บรายชื่อแอปไว้ในโค้ด แต่มองหา secret ชื่อ{" "}
          <span className="font-mono text-xs">FIREBASE_SA_&lt;SLUG&gt;</span> ตาม slug ของแอปนั้น
          โดยอัตโนมัติ (ตัวใหญ่ทั้งหมด และ <span className="font-mono text-xs">-</span> กับ{" "}
          <span className="font-mono text-xs">.</span> เปลี่ยนเป็น{" "}
          <span className="font-mono text-xs">_</span>) เพิ่มแอปใหม่จึงไม่ต้องแก้โค้ด
          ปัจจุบันตั้งไว้แล้ว 5 ตัว (tantun, jaiklai, harmony, songmu, youngwai) เมื่อเจอ secret
          ของแอปไหน <span className="font-mono text-xs">/api/public/sso/exchange</span> จะคืน{" "}
          <span className="font-mono text-xs">firebase.custom_token</span> ที่ตรงกับ Firebase
          project ของแอปนั้น แอปลูกเพียงเรียก{" "}
          <span className="font-mono text-xs">signInWithCustomToken()</span> โดยไม่ต้องเก็บ service
          account เองอีก ถ้ายังไม่ได้ตั้ง secret จะคืน{" "}
          <span className="font-mono text-xs">firebase: null</span> และแอปลูกต้องให้ผู้ใช้ล็อกอินเอง
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          uid ใน custom token ที่ hub ออกให้ จะอยู่ในรูป{" "}
          <span className="font-mono text-xs">aivora:&lt;user id&gt;</span> เสมอ แอปลูกควรตรวจ
          prefix นี้ก่อนรับ token — เป็นการกันไม่ให้ token จาก hub
          ไปทับบัญชีที่ผู้ใช้สมัครไว้เองในแอปลูก ส่วน{" "}
          <span className="font-mono text-xs">claims.aivora_user_id</span> เป็น id ดิบ ใช้ map
          กลับมาหาผู้ใช้ที่ hub ได้
        </p>
        <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm leading-relaxed text-muted-foreground">
          สำหรับแอปลูกที่ใช้ Supabase{" "}
          <strong className="text-foreground">
            ห้ามเอา <span className="font-mono text-xs">service_role</span> key มาเก็บที่ hub
          </strong>{" "}
          Firebase service account ที่ hub ถืออยู่ทำได้อย่างเดียวคือเซ็น custom token และยังมีด่าน{" "}
          <span className="font-mono text-xs">aivora:</span> ที่แอปลูกกันอีกชั้น แต่{" "}
          <span className="font-mono text-xs">service_role</span> ของ Supabase bypass RLS ทั้งหมด
          คือสิทธิ์อ่านเขียนทุกตารางในฐานข้อมูลนั้น ถ้า hub รั่ว แอปนั้นเปิดหมดโดยไม่มีอะไรกันได้
          จึงให้แอปลูกเป็นคนออก session ของตัวเองจากผลลัพธ์{" "}
          <span className="font-mono text-xs">user</span> ที่ได้จาก exchange แทน
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">เพิ่มแอป Social ใหม่ต้องทำอะไรบ้าง</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            เพิ่มแอปในหน้าจัดการ Launcher (แอดมิน) ตั้ง slug และ URL จริง แล้วใส่ URL ปลายทาง{" "}
            <span className="font-mono text-xs">&lt;origin แอปลูก&gt;/sso/callback</span> ใน
            allow-list
          </li>
          <li>
            <strong className="text-foreground">เฉพาะแอปที่ใช้ Firebase:</strong> เพิ่ม environment
            variable ที่ Netlify ของ hub:{" "}
            <span className="font-mono text-xs">FIREBASE_SA_&lt;SLUG ตัวใหญ่&gt;</span> (
            <span className="font-mono text-xs">-</span> ใน slug เปลี่ยนเป็น{" "}
            <span className="font-mono text-xs">_</span>) ค่าเป็น service account JSON ทั้งก้อนของ
            Firebase project ของแอปนั้น แล้ว trigger build ใหม่ — ถ้าไม่ใส่ SSO จะยังทำงาน แต่คืน{" "}
            <span className="font-mono text-xs">firebase: null</span> แอปลูกต้องให้ผู้ใช้ล็อกอินเอง
            ส่วนแอปที่ใช้ Supabase ให้ข้ามข้อนี้ไป —{" "}
            <span className="font-mono text-xs">service_role</span> key ของมันต้องอยู่ที่ Netlify
            ของ
            <strong className="text-foreground"> แอปลูกเอง</strong> ไม่ใช่ที่ hub
          </li>
          <li>ไปที่แอปลูก ก๊อป prompt ข้างล่างไปสั่ง AI ที่ดูแล repo ของแอปนั้น</li>
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          prompt นี้ผ่านการใช้งานจริงกับแอปลูกตัวแรกมาแล้ว ก๊อปไปใช้กับแอปที่เหลือได้เลย
          แก้แค่ค่าคงที่ 3 ตัวข้างบน prompt (<span className="font-mono text-xs">HUB_URL</span>,{" "}
          <span className="font-mono text-xs">APP_SLUG</span>,{" "}
          <span className="font-mono text-xs">CALLBACK</span>)
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          เลือก prompt ให้ตรงกับฐานข้อมูลของแอปลูก — Firebase รับ custom token จาก hub ไป{" "}
          <span className="font-mono text-xs">signInWithCustomToken()</span> ส่วน Supabase ออก
          session ของตัวเองจากผลลัพธ์ <span className="font-mono text-xs">user</span>{" "}
          ฝั่งเซิร์ฟเวอร์
          <strong className="text-foreground">
            {" "}
            แอปที่ใช้ Supabase ไม่ต้องตั้ง{" "}
            <span className="font-mono text-xs">FIREBASE_SA_&lt;SLUG&gt;</span> ที่ Netlify ของ hub
          </strong>{" "}
          เพราะ hub ไม่ได้เป็นคนออก session ให้
        </p>
        <Snippet title="Prompt สำหรับแอปลูก Social (Firebase)" code={SOCIAL_APP_PROMPT(hub)} />
        <Snippet title="Prompt สำหรับแอปลูก Social (Supabase)" code={SUPABASE_APP_PROMPT(hub)} />
      </section>
    </main>
  );
}
