import { useBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
  showName = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const { branding } = useBranding();
  const box = size === "lg" ? "size-20" : size === "sm" ? "size-9" : "size-14";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <img
        src={branding.logoSrc}
        alt={`โลโก้ ${branding.brand_name}`}
        className={cn(box, "object-contain")}
      />
      {showName ? (
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight">{branding.brand_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{branding.tagline}</p>
        </div>
      ) : null}
    </div>
  );
}
