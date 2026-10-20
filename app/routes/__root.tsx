import schibstedFont from "@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2?url";
import {
  HeadContent,
  ScriptOnce,
  Scripts,
  createRootRoute,
  rootRouteId,
  useRouterState
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StrictMode, useEffect } from "react";
import { AppToaster } from "~/components/app-toaster";
import { NotFound } from "~/components/not-found";
import { RootErrorBoundary } from "~/components/root-error-boundary";
import { PAGE_VIEW_PATHS } from "~/consts/analytics-events";
import { APP_NAME } from "~/consts/app";
import appCss from "~/styles/globals.css?url";
import { RENAME_LEGACY_STORAGE_KEYS_SCRIPT } from "~/utils/legacy-storage-keys";
import { REGISTER_SERVICE_WORKER_SCRIPT } from "~/utils/register-service-worker";
import {
  HIDE_UNTIL_SCROLL_RESTORED_SCRIPT,
  REVEAL_AFTER_SCROLL_RESTORED_SCRIPT
} from "~/utils/scroll-restoration-cloak";
import { siteMeta } from "~/utils/site-meta";
import { trackPageView } from "~/utils/track";

// The not-found page's own title and description. It asks search engines not
// to index it and carries no share card: a missing page has nothing to share.
const NOT_FOUND_META = [
  {
    title: `Page not found | ${APP_NAME}`
  },
  {
    name: "description",
    content: `This page doesn't exist on ${APP_NAME}. Go back to the homepage or open the editor.`
  },
  {
    name: "robots",
    content: "noindex"
  }
];

export const Route = createRootRoute({
  // Every page sets its own title, description and share card. When no route
  // matched (only the root did), the not-found page shows and takes its own;
  // otherwise the homepage's stand as the fallback.
  head: ({ matches }) => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        name: "theme-color",
        content: "#11746b"
      },
      ...(matches.length === 1 ? NOT_FOUND_META : siteMeta())
    ],
    links: [
      // Schibsted Grotesk is the font on every route (and a new invoice's),
      // so its latin subset preloads globally.
      {
        rel: "preload",
        href: schibstedFont,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous"
      },
      {
        rel: "stylesheet",
        href: appCss
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/favicon-96x96.png"
      },
      { rel: "shortcut icon", href: "/favicon.ico" },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png"
      },
      { rel: "manifest", href: "/site.webmanifest" }
    ],
    scripts: [
      { children: RENAME_LEGACY_STORAGE_KEYS_SCRIPT },
      { children: HIDE_UNTIL_SCROLL_RESTORED_SCRIPT },
      ...(import.meta.env.PROD
        ? [{ children: REGISTER_SERVICE_WORKER_SCRIPT }]
        : [])
    ]
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootErrorBoundary
});

function RootDocument({ children }: { children: ReactNode }) {
  // The editor's head script themes <html> (data-editor-theme, .dark) before
  // React hydrates, so its attributes legitimately differ from the server's.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <StrictMode>
          {children}
          <PageViews />
        </StrictMode>
        <ScriptOnce>{REVEAL_AFTER_SCROLL_RESTORED_SCRIPT}</ScriptOnce>
        <AppToaster />
        <Scripts />
      </body>
    </html>
  );
}

// Counts a page view each time the page changes, by its route pattern. A page
// that isn't found isn't counted.
function PageViews() {
  const path = useRouterState({
    select: state => {
      const page = state.matches.at(-1);

      if (!page || page.routeId === rootRouteId) return undefined;
      if (page.status === "notFound") return undefined;

      return PAGE_VIEW_PATHS.find(known => known === page.fullPath);
    }
  });

  useEffect(() => {
    if (path) trackPageView(path);
  }, [path]);

  return null;
}
