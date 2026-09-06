import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/line-setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ตั้งค่า LINE Developers — Aivora" },
      {
        name: "description",
        content:
          "คู่มือทีละขั้นตอนสำหรับสร้าง LINE Login channel และ LIFF app เพื่อเชื่อมกับ Aivora launcher",
      },
      { property: "og:title", content: "ตั้งค่า LINE Developers — Aivora" },
      {
        property: "og:description",
        content:
          "คู่มือทีละขั้นตอนสำหรับสร้าง LINE Login channel และ LIFF app เพื่อเชื่อมกับ Aivora",
      },
    ],
  }),
  component: LineSetupPage,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 flex gap-4">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-xs">{children}</span>
  );
}

function LineSetupPage() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-16 pt-8">
      <button
        onClick={() => navigate({ to: "/settings" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> กลับหน้าตั้งค่า
      </button>

      <h1 className="mt-6 text-2xl font-semibold">ตั้งค่า LINE Developers</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        คู่มือทีละขั้นตอนสำหรับสร้าง LINE Login channel และ LIFF app แล้วนำค่าที่ได้มาใส่ใน Aivora
        เพื่อเปิดล็อกอินอัตโนมัติจากใน LINE ทำครั้งเดียว ใช้ได้กับทุกแอปใน Launcher
      </p>

      <section className="mt-6 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">สิ่งที่จะได้เมื่อทำเสร็จ</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> Channel ID (เลข 10 หลัก)
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> Channel Secret
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> LIFF ID (รูป <Mono>1234567890-AbCdEfGh</Mono>)
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          ค่าทั้งสามนี้จะนำมาเก็บเป็น secret ของโปรเจกต์ ไม่ปรากฏในโค้ด
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">ส่วนที่ 1 — สร้าง Provider และ LINE Login channel</h2>

        <Step n={1} title="เข้า LINE Developers Console">
          <p>
            เปิด{" "}
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              developers.line.biz/console <ExternalLink className="size-3.5" />
            </a>{" "}
            แล้วล็อกอินด้วยบัญชี LINE ของคุณ (แนะนำบัญชีที่เป็นเจ้าของ LINE OA ที่จะใช้เป็น
            Launcher)
          </p>
        </Step>

        <Step n={2} title="สร้าง Provider (ถ้ายังไม่มี)">
          <p>
            ไปที่ <b>Providers</b> → กด <b>Create</b> → ตั้งชื่อ (เช่น “Life OS”
            หรือชื่อองค์กรของคุณ) → กด <b>Create</b>
          </p>
          <p>
            Provider คือกลุ่มที่รวม channel ต่างๆ ของคุณ สร้างครั้งเดียวใช้กับทั้ง LINE Login และ
            LIFF
          </p>
        </Step>

        <Step n={3} title="สร้าง LINE Login channel">
          <p>
            เข้า Provider ที่สร้าง → แท็บ <b>Channels</b> → กด <b>Create a LINE Login channel</b>
          </p>
        </Step>

        <Step n={4} title="กรอกรายละเอียด channel">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Channel type</b>: เลือก <b>LINE Login</b>
            </li>
            <li>
              <b>Provider</b>: เลือก Provider จากขั้นที่แล้ว
            </li>
            <li>
              <b>Company or business type</b>: เลือกแบบที่ตรง (ส่วนตัว/บริษัท)
            </li>
            <li>
              <b>Channel name</b>: เช่น “Aivora Login” (ชื่อที่ผู้ใช้เห็นตอนขอสิทธิ์)
            </li>
            <li>
              <b>Channel description</b>: คำอธิบายสั้นๆ
            </li>
            <li>
              <b>App types</b>: ติ๊ก <b>Web app</b> (เพราะ Aivora เป็นเว็บ)
            </li>
            <li>
              <b>Email address</b>: อีเมลสำหรับติดต่อ/แจ้งเตือน
            </li>
            <li>
              <b>Privacy policy URL</b> & <b>Terms of use URL</b>: ใส่ URL ของหน้านโยบาย/เงื่อนไข
              (ถ้ายังไม่มี ใส่ URL หน้าแรกของ Aivora ไปก่อนได้ แล้วแก้ภายหลัง)
            </li>
          </ul>
          <p>
            กด <b>Create</b> แล้วยืนยันด้วยบัญชี LINE
          </p>
        </Step>

        <Step n={5} title="ตั้งค่า Callback URL">
          <p>
            เข้า channel ที่สร้าง → แท็บ <b>LINE Login</b> → ส่วน <b>Callback URL</b> → กด{" "}
            <b>Edit</b> แล้วเพิ่ม:
          </p>
          <p>
            <Mono>{"https://<aivora-domain>/auth/callback"}</Mono>
          </p>
          <p>
            แทน {"<aivora-domain>"} ด้วยโดเมนจริงของ Aivora (ทั้ง preview และ published
            ถ้าใช้คนละโดเมน ให้เพิ่มทั้งคู่) — ต้องเป็น <b>https</b> เท่านั้น
          </p>
        </Step>

        <Step n={6} title="เปิด OpenID Connect scopes">
          <p>
            ยังในแท็บ <b>LINE Login</b> → ส่วน <b>OpenID Connect</b> → กด <b>Apply</b>{" "}
            แล้วเปิดสิทธิ์เหล่านี้:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>profile</b> (ชื่อ + รูป)
            </li>
            <li>
              <b>openid</b> (ID token — สำคัญ ใช้ยืนยันตัวตนฝั่งเซิร์ฟเวอร์)
            </li>
            <li>
              <b>email</b> (เพื่อ merge กับบัญชีที่ใช้อีเมลเดียวกัน — ถ้าไม่เปิด Aivora
              จะใช้อีเมลสังเคราะห์แทน ยังล็อกอินได้)
            </li>
          </ul>
        </Step>

        <Step n={7} title="เปิดใช้งาน channel">
          <p>
            ไปแท็บ <b>Channel settings</b> (หรือ <b>Basic settings</b>) → ตรง <b>Channel status</b>{" "}
            กด <b>Developing</b>
            ให้เปลี่ยนเป็น <b>Published</b>
          </p>
          <p>
            สถานะ <b>Developing</b> ใช้ทดสอบกับ LINE OA admin ได้ แต่ผู้ใช้ทั่วไปต้องเป็น{" "}
            <b>Published</b> ก่อน
          </p>
        </Step>

        <Step n={8} title="บันทึก Channel ID และ Channel Secret">
          <p>
            ที่หน้า <b>Basic settings</b> ของ channel → คัดลอก <b>Channel ID</b> (เลข 10 หลัก) และกด{" "}
            <b>Show</b> ที่ <b>Channel secret</b> แล้วคัดลอกด้วย
          </p>
          <p className="text-xs">
            ค่าทั้งสองนี้จะเก็บเป็น <Mono>LINE_CHANNEL_ID</Mono> และ{" "}
            <Mono>LINE_CHANNEL_SECRET</Mono>
          </p>
        </Step>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">ส่วนที่ 2 — สร้าง LIFF app</h2>

        <Step n={9} title="เข้าหน้า LIFF">
          <p>
            กลับไปที่หน้า Provider เดิม → แท็บ <b>LIFF</b> (หรือเมนู <b>LIFF</b> ใน Console) → กด{" "}
            <b>Add</b>
          </p>
        </Step>

        <Step n={10} title="กรอกค่า LIFF">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>LIFF app name</b>: เช่น “Aivora Launcher”
            </li>
            <li>
              <b>Size</b>: เลือก <b>Full</b> (เต็มจอใน LINE)
            </li>
            <li>
              <b>Endpoint URL</b>: ใส่ URL หน้าแรกของ Aivora —{" "}
              <Mono>{"https://<aivora-domain>/"}</Mono> (มี <Mono>/</Mono> ปิดท้าย)
            </li>
            <li>
              <b>View mode</b>: เลือกตามต้องการ (<b>Embedded</b> หรือ <b>External</b>) — ส่วนใหญ่ใช้{" "}
              <b>Embedded</b>
            </li>
            <li>
              <b>Scope</b>: ติ๊ก <b>profile</b>, <b>openid</b>, <b>email</b> (เหมือนที่เปิดใน
              channel)
            </li>
            <li>
              <b>Bot link</b>: เลือก <b>On (Normal)</b> หรือ <b>On (Aggressive)</b>{" "}
              ถ้าต้องการให้ผู้ใช้เพิ่มเพื่อน LINE OA อัตโนมัติ
            </li>
          </ul>
          <p>
            กด <b>Add</b>
          </p>
        </Step>

        <Step n={11} title="คัดลอก LIFF ID">
          <p>
            หลังสร้างเสร็จ จะเห็น <b>LIFF ID</b> รูปแบบ <Mono>1234567890-AbCdEfGh</Mono> อยู่ในตาราง
            LIFF คัดลอกเก็บไว้ — ค่านี้จะเก็บเป็น <Mono>LINE_LIFF_ID</Mono>
          </p>
        </Step>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-semibold">ส่วนที่ 3 — ผูก LINE OA (ถ้าต้องการเปิดจาก Rich Menu)</h2>

        <Step n={12} title="เพิ่ม Rich Menu ใน LINE OA">
          <p>
            ใน LINE Official Account Manager → <b>Rich Menu</b> → สร้างเมนูที่มีปุ่มกดเปิด LIFF URL:
          </p>
          <p>
            <Mono>{"https://liff.line.me/<LIFF-ID>"}</Mono>
          </p>
          <p>
            แทน {"<LIFF-ID>"} ด้วย LIFF ID จากขั้นที่ 11 ผู้ใช้กดปุ่มใน Rich Menu → เปิด Aivora ใน
            LINE ล็อกอินอัตโนมัติ
          </p>
        </Step>
      </section>

      <section className="mt-4 rounded-3xl border border-primary/40 bg-primary/5 p-6">
        <h2 className="font-semibold text-primary">ส่วนที่ 4 — ส่งค่าให้ผมใส่เป็น secret</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          พอได้ครบสามค่าแล้ว ส่งมาให้ผม (หรือกดเพิ่มเองใน Settings → Secrets):
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <Mono>LINE_CHANNEL_ID</Mono> — จากขั้นที่ 8
          </li>
          <li>
            <Mono>LINE_CHANNEL_SECRET</Mono> — จากขั้นที่ 8
          </li>
          <li>
            <Mono>LINE_LIFF_ID</Mono> — จากขั้นที่ 11
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          ใส่ครบแล้วสถานะในหน้าตั้งค่าจะเปลี่ยนเป็น “พร้อมใช้งาน” และล็อกอินจากใน LINE จะทำงานทันที
        </p>
      </section>
    </main>
  );
}
