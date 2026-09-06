import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

/**
 * Plain TanStack Start config — this project used to build through
 * @lovable.dev/vite-tanstack-config, which bundled these plugins invisibly.
 * Everything it did is now explicit here.
 *
 * Plugin order matters: tsConfigPaths must resolve "@/..." before anything else
 * touches the modules, and viteReact goes last so Start's transforms run first.
 */
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps the SSR entry so h3-swallowed 500s still render a page.
      server: { entry: "server" },
    }),
    // Netlify Functions run Node, which firebase-admin needs. Do not switch this
    // to an edge/worker preset — the Admin SDK will not load there.
    nitro({ preset: "netlify" }),
    viteReact(),
  ],
});
