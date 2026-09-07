import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImageUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { AppCategory, AppDoc } from "@/integrations/firebase/schema";
import {
  deleteApp,
  listApps,
  saveApp,
  saveBrandingText,
  uploadBrandingLogo,
  type AppRecord,
} from "@/lib/hub-data";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ผู้ดูแลระบบ — Aivora" },
      { name: "description", content: "จัดการโลโก้ ชื่อแบรนด์ และรายการเว็บแอปใน Aivora Launcher" },
      { property: "og:title", content: "ผู้ดูแลระบบ — Aivora" },
      {
        property: "og:description",
        content: "จัดการโลโก้ ชื่อแบรนด์ และรายการเว็บแอปใน Aivora Launcher",
      },
    ],
  }),
  component: AdminPage,
});

type Draft = Omit<AppRecord, "id" | "allowedRedirectPrefixes"> & {
  id: string | null;
  prefixes: string;
};

function emptyDraft(sortOrder: number, category: AppCategory): Draft {
  return {
    id: null,
    slug: "",
    name: "",
    description: "",
    url: "",
    icon: "layout-grid",
    accent: "primary",
    category,
    sortOrder,
    isActive: true,
    prefixes: "",
  };
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin(user);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/admin" } });
  }, [loading, user, navigate]);

  if (loading || roleLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <Skeleton className="h-40 rounded-3xl" />
      </main>
    );
  }

  if (user && !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-border bg-card/70 p-8 text-center">
          <h1 className="text-lg font-semibold">เฉพาะผู้ดูแลระบบ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            บัญชีนี้ยังไม่มีสิทธิ์ admin จึงเข้าหน้าจัดการไม่ได้ — เพิ่มอีเมลนี้ใน ADMIN_EMAILS
            แล้วเข้าสู่ระบบใหม่
          </p>
          <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/" })}>
            กลับหน้าแรก
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-20 pt-8">
      <button
        onClick={() => navigate({ to: "/" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> กลับหน้าแรก
      </button>
      <h1 className="mt-6 text-2xl font-semibold">จัดการ Launcher</h1>
      <BrandingSection
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ["branding"] })}
      />
      <AppsSection category="social" title="แอปกลุ่ม Social (ใช้ SSO)" sso />
      <AppsSection category="business" title="แอปกลุ่ม Business (ไม่ใช้ SSO)" sso={false} />
    </main>
  );
}

function BrandingSection({ onSaved }: { onSaved: () => void }) {
  const { branding } = useBranding();
  const [name, setName] = useState(branding.brand_name);
  const [tagline, setTagline] = useState(branding.tagline);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(branding.brand_name);
    setTagline(branding.tagline);
  }, [branding.brand_name, branding.tagline]);

  async function saveText() {
    setBusy(true);
    try {
      await saveBrandingText(name, tagline);
      onSaved();
      toast.success("บันทึกชื่อแบรนด์แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    try {
      await uploadBrandingLogo(file);
      onSaved();
      toast.success("เปลี่ยนโลโก้แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดโลโก้ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card/70 p-6">
      <h2 className="font-semibold">แบรนด์ &amp; โลโก้</h2>
      <div className="mt-5 flex items-center gap-4">
        <img
          src={branding.logoSrc}
          alt={`โลโก้ ${branding.brand_name}`}
          className="size-16 rounded-2xl border border-border object-contain p-1"
        />
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp className="size-4" /> เปลี่ยนโลโก้
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            PNG, SVG หรือ WebP แนะนำสี่เหลี่ยมจัตุรัส
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand-name">ชื่อแบรนด์</Label>
          <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-tagline">คำโปรย</Label>
          <Input id="brand-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <Button className="rounded-full" onClick={saveText} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} บันทึก
        </Button>
      </div>
    </section>
  );
}

function AppsSection({
  category,
  title,
  sso,
}: {
  category: AppCategory;
  title: string;
  sso: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const appsQuery = useQuery({
    queryKey: ["admin-apps"],
    queryFn: listApps,
    // A rules or config failure is permanent — retrying three times only
    // delays the message and leaves the list looking empty in the meantime.
    retry: 1,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-apps"] });
    void queryClient.invalidateQueries({ queryKey: ["apps"] });
    void queryClient.invalidateQueries({ queryKey: ["apps-settings"] });
  }

  async function save() {
    if (!draft) return;
    if (!draft.slug.trim() || !draft.name.trim() || !draft.url.trim()) {
      toast.error("ต้องกรอก slug, ชื่อ และ URL");
      return;
    }
    setBusy(true);
    try {
      const payload: AppDoc = {
        slug: draft.slug.trim(),
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        url: draft.url.trim(),
        icon: draft.icon.trim() || "layout-grid",
        accent: draft.accent.trim() || "primary",
        category: draft.category === "business" ? "business" : "social",
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
        allowedRedirectPrefixes: draft.prefixes
          .split(/[\n,]/)
          .map((p) => p.trim())
          .filter(Boolean),
      };
      await saveApp(draft.id, payload);
      setDraft(null);
      refresh();
      toast.success("บันทึกแอปแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function remove(app: AppRecord) {
    if (!window.confirm(`ลบ "${app.name}" ออกจาก Launcher?`)) return;
    try {
      await deleteApp(app.id);
      refresh();
      toast.success("ลบแอปแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    }
  }

  const apps = (appsQuery.data ?? []).filter((app) => app.category === category);

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => setDraft(emptyDraft(apps.length * 10 + 10, category))}
        >
          <Plus className="size-4" /> เพิ่มแอป
        </Button>
      </div>

      {draft ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-primary/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`app-name-${category}`}>ชื่อแอป</Label>
              <Input
                id={`app-name-${category}`}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`app-slug-${category}`}>slug</Label>
              <Input
                id={`app-slug-${category}`}
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`app-url-${category}`}>URL ของแอป</Label>
            <Input
              id={`app-url-${category}`}
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://example.netlify.app"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`app-desc-${category}`}>คำอธิบาย</Label>
            <Textarea
              id={`app-desc-${category}`}
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          {sso ? (
            <div className="space-y-2">
              <Label htmlFor={`app-prefixes-${category}`}>
                Allow-list ปลายทาง SSO (คนละบรรทัด)
              </Label>
              <Textarea
                id={`app-prefixes-${category}`}
                rows={2}
                value={draft.prefixes}
                onChange={(e) => setDraft({ ...draft, prefixes: e.target.value })}
                placeholder="https://example.netlify.app/sso/callback"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
              กลุ่ม Business เปิดแอปตรง ๆ ไม่ส่ง SSO ผู้ใช้จะไปล็อกอินที่แอปนั้นเอง
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`app-icon-${category}`}>ไอคอน (lucide)</Label>
              <Input
                id={`app-icon-${category}`}
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`app-order-${category}`}>ลำดับ</Label>
              <Input
                id={`app-order-${category}`}
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={`app-active-${category}`}
              checked={draft.isActive}
              onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
            />
            <Label htmlFor={`app-active-${category}`}>เปิดใช้งานใน Launcher</Label>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              บันทึก
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : null}

      {appsQuery.isError ? (
        // Without this branch an unreadable collection renders as an empty
        // list, which is indistinguishable from "no apps configured yet".
        <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium">โหลดรายการแอปไม่สำเร็จ</p>
          <p className="mt-2 break-words text-xs text-muted-foreground">
            {appsQuery.error instanceof Error ? appsQuery.error.message : "ไม่ทราบสาเหตุ"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={() => void appsQuery.refetch()}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {apps.map((app) => (
          <li key={app.id} className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {app.name}{" "}
                  {!app.isActive ? (
                    <span className="text-xs text-muted-foreground">(ปิดใช้งาน)</span>
                  ) : null}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{app.url}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    setDraft({
                      ...app,
                      description: app.description ?? "",
                      prefixes: app.allowedRedirectPrefixes.join("\n"),
                    })
                  }
                >
                  แก้ไข
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`ลบ ${app.name}`}
                  onClick={() => remove(app)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
