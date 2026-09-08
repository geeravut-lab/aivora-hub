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

const AI_PROMPT = (
  hub: string,
) => `เพิ่มการล็อกอินแบบ SSO ผ่าน "Aivora hub" เข้ามาในแอปนี้ โดยห้ามลบหรือแก้ระบบล็อกอินเดิม
(Firebase email/password และ Google) — SSO เป็นทางเลือกเพิ่ม ไม่ใช่ตัวแทน

ค่าคงที่:
- HUB_URL = ${hub}
- APP_SLUG = <ใส่ slug ของแอปนี้ เช่น tantun>
- CALLBACK = \${window.location.origin}/sso/callback  (ต้องถูกใส่ไว้ใน allow-list ที่ hub แล้ว)

สิ่งที่ต้องทำ:
1) สร้างหน้า /sso/callback อ่าน query param "sso_ticket"
2) ส่ง ticket ไปแลกที่ serverless function ของเราเอง (Netlify function ชื่อ sso-exchange)
   ห้าม fetch ไปที่ hub ตรงจากเบราว์เซอร์
3) ใน sso-exchange: POST { ticket } ไปที่ \${HUB_URL}/api/public/sso/exchange
   จะได้ { user: { id, display_name, avatar_url, email, roles }, app_slug,
           firebase: { custom_token, project_id } }
   - ตรวจว่า app_slug ตรงกับ APP_SLUG ของเรา และ firebase.project_id ตรงกับ
     projectId ของ Firebase แอปนี้ ถ้าไม่ตรงให้ปฏิเสธ
   - ไม่ต้องใช้ Firebase Admin SDK และไม่ต้องเก็บ service account ในแอปลูกอีก
     เพราะ hub เซ็น custom token ให้แล้ว (uid = user.id ของ Aivora, อายุ 1 ชม.)
   - ส่ง firebase.custom_token + user กลับไปให้ client
4) ที่ client เรียก signInWithCustomToken(auth, custom_token) แล้ว upsert โปรไฟล์
   (email/display_name/avatar_url) ตามสคีมาเดิม จากนั้น redirect เข้าหน้าหลัก
   ตั้งแต่จุดนี้โค้ด Firebase เดิมทั้งหมดทำงานต่อได้ปกติ
5) เพิ่มปุ่ม "เข้าสู่ระบบด้วย LINE (Aivora)" บนหน้า login เดิม กดแล้วไปที่
   \${HUB_URL}/sso/authorize?app=\${APP_SLUG}&return=\${encodeURIComponent(CALLBACK)}
6) จัดการ error: ตั๋วหมดอายุ (60 วินาที) / ใช้ซ้ำ / invalid_ticket ให้แสดงข้อความและกลับหน้า login เดิม

ข้อกำหนดความปลอดภัย: ห้ามเก็บ service account key หรือแลกตั๋วในโค้ดฝั่ง client,
ตรวจ ticket ทุกครั้งฝั่งเซิร์ฟเวอร์เท่านั้น`;

const LIFE_OS_PROMPT = (
  hub: string,
) => `เพิ่มการล็อกอินแบบ SSO ผ่าน "Aivora hub" ให้แอปนี้ (Life OS บน Lovable + Lovable Cloud)
โดยไม่แก้ระบบล็อกอินเดิม (อีเมล/Google) — SSO เป็นทางเลือกเพิ่ม

ค่าคงที่:
- HUB_URL = ${hub}
- APP_SLUG = life-os
- CALLBACK = \${window.location.origin}/sso/callback (อยู่ใน allow-list ของ hub แล้ว)

สิ่งที่ต้องทำ:
1) สร้าง route /sso/callback (ssr: false) อ่าน query param "sso_ticket"
2) สร้าง server function (createServerFn, POST) ชื่อ consumeSsoTicket:
   - POST { ticket } ไปที่ \${HUB_URL}/api/public/sso/exchange
   - ตรวจว่า app_slug === "life-os" ถ้าไม่ตรงให้ throw
   - ใช้ supabaseAdmin ของโปรเจกต์นี้: หา user จาก email ที่ได้ ถ้าไม่มีให้
     createUser({ email, email_confirm: true }) แล้ว upsert profiles
   - ออก session ด้วย generateLink({ type: "magiclink", email }) แล้ว
     verifyOtp({ type: "magiclink", token_hash }) เพื่อคืน { access_token, refresh_token }
3) ที่หน้า callback เรียก supabase.auth.setSession(tokens) แล้ว navigate ไปหน้าหลัก
4) เพิ่มปุ่ม "เข้าสู่ระบบด้วย LINE (Aivora)" ในหน้า login เดิม → ไปที่
   \${HUB_URL}/sso/authorize?app=life-os&return=\${encodeURIComponent(CALLBACK)}
5) จัดการ error: ตั๋วหมดอายุ 60 วินาที / ใช้ซ้ำ / invalid_ticket → แจ้งผู้ใช้และกลับหน้า login

หมายเหตุ: Life OS ไม่ใช้ Firebase จึงไม่ต้องใช้ custom token — ใช้ผลลัพธ์ user จาก exchange
สร้าง/ผูกบัญชีใน Lovable Cloud ของตัวเองด้วย service role ฝั่งเซิร์ฟเวอร์เท่านั้น`;

const CHILD_APP_FIX_PROMPT = (
  hub: string,
) => `แอปนี้เป็นแอปลูกฝั่ง Social ของ Aivora Hub ที่ต้องล็อกอินผ่าน SSO
งานนี้แก้ 2 เรื่อง: หน้า /sso/callback แสดงผลพัง และ flow แลกตั๋ว

## ปัญหาที่พิสูจน์แล้ว — asset path เป็น relative

เปิด https://<โดเมนแอปนี้>/sso/callback แล้วหน้าเว็บขึ้นมาแบบไม่มี CSS
สาเหตุคือ index.html อ้าง asset แบบ relative (เช่น "./assets/index.js" หรือ "assets/index.js")
พออยู่ที่ route ซ้อนชั้น /sso/callback เบราว์เซอร์จึงไปขอที่ /sso/assets/... ซึ่ง 404
ผลไม่ใช่แค่หน้าตาเพี้ยน — JS ที่ใช้แลกตั๋วก็ไม่ถูกโหลด SSO จึงไม่ทำงานเลย
(หน้าแรก / ไม่พัง เพราะ relative path บังเอิญตรงกับ root)

แก้:
1) ใน vite.config.ts ตั้ง base: "/" (ถ้ามี base เป็น "./" หรือค่าอื่น ให้เปลี่ยน)
2) npm run build แล้วเปิด dist/index.html ยืนยันว่า src/href ทุกตัวขึ้นต้นด้วย "/"
   ไม่มี "./" และไม่มี path ที่ไม่มี slash นำหน้า
3) ยืนยัน SPA fallback: ต้องมี public/_redirects บรรทัด  /*  /index.html  200
   (หรือ [[redirects]] ใน netlify.toml) ไม่งั้น /sso/callback จะ 404 ตั้งแต่ต้น
4) หลัง deploy เช็คด้วย curl: curl -I https://<โดเมน>/assets/<ชื่อไฟล์จริง>.js
   ต้องได้ 200 และ content-type เป็น javascript ไม่ใช่ text/html

## flow SSO ที่ต้องมี (ตรวจของเดิม ถ้ายังไม่มีให้ทำ)

ค่าคงที่:
- HUB_URL = ${hub}
- APP_SLUG = <slug ของแอปนี้ ต้องตรงกับที่ตั้งในหน้าจัดการ Launcher ของ hub>
- CALLBACK = <origin ของแอปนี้>/sso/callback (ต้องอยู่ใน allow-list ที่ hub แล้ว)

1) ปุ่ม "เข้าสู่ระบบด้วย LINE (Aivora)" บนหน้า login เดิม กดแล้วไปที่
   ${hub}/sso/authorize?app=<APP_SLUG>&return=<CALLBACK ที่ encodeURIComponent แล้ว>
2) หน้า /sso/callback อ่าน query param "sso_ticket"
3) ส่ง ticket ไปแลกที่ serverless function ของแอปนี้เอง (เช่น Netlify function sso-exchange)
   ห้าม fetch ไป hub ตรงจากเบราว์เซอร์เด็ดขาด — ตั๋วและข้อมูลผู้ใช้จะรั่วอยู่ในโค้ดหน้าเว็บ
4) ใน function: POST { ticket } ไปที่ ${hub}/api/public/sso/exchange
   ได้กลับมาเป็น
   { user: { id, display_name, avatar_url, email, roles }, app_slug,
     firebase: { custom_token, project_id } | null }
   - ตรวจ app_slug ตรงกับ APP_SLUG ของเรา ไม่ตรงให้ปฏิเสธ
   - ถ้า firebase ไม่ใช่ null ตรวจ project_id ตรงกับ projectId ของ Firebase แอปนี้ ไม่ตรงให้ปฏิเสธ
   - ไม่ต้องใช้ Firebase Admin SDK และไม่ต้องเก็บ service account ในแอปลูก hub เซ็นให้แล้ว
   - uid ใน custom token เป็นรูป aivora:<id> — ตรวจ prefix ได้ แต่อย่าคาดหวัง uid ดิบ
   - display_name / email / avatar_url จาก hub เป็น null ได้ (ไม่ใช่ undefined)
     การตรวจ shape ต้องรับ null ด้วย
5) client เรียก signInWithCustomToken(auth, custom_token) แล้ว upsert โปรไฟล์
   (email / display_name / avatar_url) ตามสคีมาเดิม แล้ว redirect เข้าหน้าหลัก
   ถ้า firebase เป็น null (แอปยังไม่ได้ตั้ง service account ที่ hub) ให้พาไปหน้า login เดิม
   พร้อมข้อความ ไม่ใช่ค้างหน้าขาว
6) error ที่ต้องรองรับ: ตั๋วหมดอายุ (60 วินาที) / ใช้ซ้ำ / invalid_ticket
   แสดงข้อความแล้วกลับหน้า login เดิม

ห้ามลบหรือแก้ระบบล็อกอินเดิม (email/password และ Google) — SSO เป็นทางเลือกเพิ่ม ไม่ใช่ตัวแทน
ห้ามเก็บ service account key ฝั่ง client และห้ามแลกตั๋วในโค้ดเบราว์เซอร์

## ก่อนบอกว่าเสร็จ
- npm run build ผ่าน
- ยืนยันด้วย curl ว่า asset โหลด 200 ที่ /sso/callback (ไม่ใช่แค่ที่ /)
- บอกมาด้วยว่ายังไม่ได้ทดสอบอะไร และต้องให้คนทดสอบจริงตรงไหน`;

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
        <h2 className="font-semibold">Prompt สำหรับสั่ง AI ในแอปลูก</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          ก๊อป prompt นี้ไปวางในเครื่องมือ AI ที่ใช้สร้างแอปลูก แก้แค่{" "}
          <span className="font-mono text-xs">APP_SLUG</span> ให้ตรงกับแอปนั้น — prompt ระบุชัดว่า
          “ห้ามลบล็อกอินเดิม” ดังนั้นผู้ใช้ที่เข้าแอปผ่านเบราว์เซอร์ตรง ยังล็อกอินด้วยอีเมล/รหัสผ่าน
          หรือ Google ได้เหมือนเดิม
        </p>
        <Snippet title="Prompt (ภาษาไทย, พร้อมใช้)" code={AI_PROMPT(hub)} />
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
            เพิ่ม environment variable ที่ Netlify ของ hub:{" "}
            <span className="font-mono text-xs">FIREBASE_SA_&lt;SLUG ตัวใหญ่&gt;</span> (
            <span className="font-mono text-xs">-</span> ใน slug เปลี่ยนเป็น{" "}
            <span className="font-mono text-xs">_</span>) ค่าเป็น service account JSON ทั้งก้อนของ
            Firebase project ของแอปนั้น แล้ว trigger build ใหม่ — ถ้าไม่ใส่ SSO จะยังทำงาน แต่คืน{" "}
            <span className="font-mono text-xs">firebase: null</span> แอปลูกต้องให้ผู้ใช้ล็อกอินเอง
          </li>
          <li>ไปที่แอปลูก ก๊อป prompt ข้างล่างไปสั่ง AI ที่ดูแล repo ของแอปนั้น</li>
        </ol>
        <Snippet
          title="Prompt สำหรับแอปลูก Social (แก้ asset path + SSO)"
          code={CHILD_APP_FIX_PROMPT(hub)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">Life OS (Lovable Cloud อีก workspace)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Life OS ไม่ใช้ Firebase จึงใช้ผลลัพธ์จาก exchange สร้าง/ผูกบัญชีใน Lovable Cloud ของตัวเอง
          แล้วออก session ฝั่งเซิร์ฟเวอร์ ก๊อป prompt นี้ไปวางใน workspace ของ Life OS
        </p>
        <Snippet title="Prompt สำหรับ Life OS" code={LIFE_OS_PROMPT(hub)} />
      </section>
    </main>
  );
}
