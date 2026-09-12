import { createFileRoute } from "@tanstack/react-router";
import { AppLauncher } from "@/components/AppLauncher";

export const Route = createFileRoute("/business")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aivora Business — รวมเว็บแอปสำหรับธุรกิจ" },
      {
        name: "description",
        content: "เปิดเว็บแอปสำหรับธุรกิจจาก LINE ได้ทันที แล้วเข้าสู่ระบบที่แอปนั้นตามปกติ",
      },
      { property: "og:title", content: "Aivora Business — รวมเว็บแอปสำหรับธุรกิจ" },
      {
        property: "og:description",
        content: "เปิดเว็บแอปสำหรับธุรกิจจาก LINE ได้ทันที แล้วเข้าสู่ระบบที่แอปนั้นตามปกติ",
      },
    ],
  }),
  component: BusinessLauncher,
});

/** Business apps are opened directly — no SSO ticket; users sign in at each app. */
function BusinessLauncher() {
  return <AppLauncher category="business" sso={false} settingsPath="/settings" />;
}
