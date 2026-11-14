import type { ReactNode } from "react";
import { SceneBackground, SceneProvider } from "@/components/scene";
import { NavRail } from "./NavRail";
import { Topbar } from "./Topbar";

export type AppShellVariant = "reading" | "immersive";

/**
 * The application shell: a dark, atmospheric instrument frame around a bright
 * reading surface.
 *
 * The environment renders behind the chrome as fixed glass (header and
 * navigation rail) while the content column stays light and legible, so route
 * content keeps its current reading conditions. Full-bleed surfaces such as
 * the assessment escape the content padding exactly as they did before.
 *
 * The `immersive` variant drops the reading surface so a route can compose a
 * full-bleed cinematic composition, and asks for the WebGL scene layer. Only
 * the landing route uses it; every other route keeps the CSS scene.
 */
export function AppShell({ children, variant = "reading" }: { readonly children: ReactNode; readonly variant?: AppShellVariant }) {
  return (
    <SceneProvider layer={variant === "immersive" ? "webgl" : "css"}>
      <div className={`relative flex min-h-screen flex-col ${variant === "immersive" ? "bg-void text-glow" : "text-ink"}`}>
        <SceneBackground />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-ion focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-void"
        >
          Skip to content
        </a>
        <Topbar />
        <div className="relative mx-auto flex w-full max-w-[1680px] flex-1">
          <NavRail />
          <main
            id="main-content"
            className={variant === "immersive" ? "min-w-0 flex-1" : "min-w-0 flex-1 bg-surface-muted px-6 py-10 md:px-10"}
          >
            {children}
          </main>
        </div>
      </div>
    </SceneProvider>
  );
}
