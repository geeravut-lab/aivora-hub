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
        <h2 className="font-semibold">Firebase custom token (5 แอปบน Netlify)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          service account ของทั้ง 5 แอปถูกเก็บเป็น secret ที่ hub แล้ว (tantun, jaiklai, harmony,
          songmu, youngwai) ดังนั้น{" "}
          <span className="font-mono text-xs">/api/public/sso/exchange</span> จะคืน{" "}
          <span className="font-mono text-xs">firebase.custom_token</span> มาให้ตรงกับ Firebase
          project ของแอปนั้น แอปลูกเพียงเรียก{" "}
          <span className="font-mono text-xs">signInWithCustomToken()</span> โดยไม่ต้องเก็บ service
          account เองอีก
        </p>
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
