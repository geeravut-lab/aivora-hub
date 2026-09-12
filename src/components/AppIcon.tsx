import { LayoutGrid } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { isLucideIconName } from "@/lib/lucide-icons";

/**
 * Renders any lucide icon by its kebab-case name, as typed in the admin form.
 *
 * Icons are loaded on demand from lucide's dynamic map, so the launcher does
 * not carry the full icon set in its bundle — only the handful in use. An
 * unknown name falls back to layout-grid instead of throwing, which is what
 * the old hard-coded check did for everything that was not "sparkles".
 */
export function AppIcon({ name, className }: { name: string; className?: string }) {
  const trimmed = name.trim().toLowerCase();
  if (!isLucideIconName(trimmed)) return <LayoutGrid className={className} />;
  return (
    <DynamicIcon
      name={trimmed}
      className={className}
      fallback={() => <LayoutGrid className={className} />}
    />
  );
}
