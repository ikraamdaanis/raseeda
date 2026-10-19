import { createRouter } from "@tanstack/react-router";
import { routeTree } from "~/app/routeTree.gen";

export function getRouter() {
  // The first render after a page load leaves the scroll alone: a reload's
  // position is restored by the cloak scripts
  // (utils/scroll-restoration-cloak.ts) and a link to a #section by the
  // browser, while on a fresh visit the reader may already have scrolled
  // before the page hydrated, and the router's reset to the top would yank
  // them back. Every navigation after that restores or resets as usual.
  let isFirstRender = true;

  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPendingMinMs: 0,
    scrollRestoration: () => {
      if (!isFirstRender) return true;

      isFirstRender = false;

      return false;
    }
  });
}
