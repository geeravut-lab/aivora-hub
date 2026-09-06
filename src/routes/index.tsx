import { createFileRoute } from "@tanstack/react-router";
import { AppLauncher } from "@/components/AppLauncher";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aivora Launcher — เข้าทุกแอปด้วย LINE" },
      {
        name: "description",
        content: "เปิดจาก LINE ล็อกอินครั้งเดียว แล้วเข้าใช้งานเว็บแอปทั้งหมดได้ทันที",
      },
      { property: "og:title", content: "Aivora Launcher — เข้าทุกแอปด้วย LINE" },
      {
        property: "og:description",
        content: "เปิดจาก LINE ล็อกอินครั้งเดียว แล้วเข้าใช้งานเว็บแอปทั้งหมดได้ทันที",
      },
    ],
  }),
  component: SocialLauncher,
});

function SocialLauncher() {
  return (
    <AppLauncher
      category="social"
      sso
      heading="แอปของคุณ"
      subheading="ล็อกอินครั้งเดียว ใช้ได้ทุกแอป"
      settingsPath="/settings"
    />
  );
}
