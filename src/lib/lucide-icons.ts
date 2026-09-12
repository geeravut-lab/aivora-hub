import { dynamicIconImports, type IconName } from "lucide-react/dynamic";

/** True when `name` is a kebab-case icon lucide can load, e.g. "calendar". */
export function isLucideIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(dynamicIconImports, name);
}
