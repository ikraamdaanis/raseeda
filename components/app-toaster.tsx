import type { CSSProperties } from "react";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import type { EditorTheme } from "~/types";
import { watchForNewVersion } from "~/utils/new-version-prompt";

// Toasts follow the editor's scheme while it's open (the editor sets
// data-editor-theme on <html>); everywhere else the site is light.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-editor-theme"]
  });

  return () => observer.disconnect();
}

function getEditorTheme(): EditorTheme | null {
  const theme = document.documentElement.dataset.editorTheme;

  return theme === "dark" || theme === "light" ? theme : null;
}

function getServerEditorTheme(): EditorTheme | null {
  return null;
}

// On a phone the editor's tab bar runs along the bottom, so toasts sit above
// it there.
const EDITOR_MOBILE_OFFSET = {
  bottom: "calc(4.5rem + env(safe-area-inset-bottom))"
};

// Sonner's light rich colours set their text under 4.5:1 against their own
// backgrounds, short of WCAG AA, so each is a shade darker here. The dark ones
// pass as they are.
const LIGHT_TOAST_TEXT = {
  "--success-text": "hsl(140, 100%, 25%)",
  "--error-text": "hsl(360, 100%, 43%)",
  "--info-text": "hsl(210, 92%, 43%)",
  "--warning-text": "hsl(31, 92%, 35%)"
} as CSSProperties;

export function AppToaster() {
  const editorTheme = useSyncExternalStore(
    subscribe,
    getEditorTheme,
    getServerEditorTheme
  );

  // Mounted once on every page, so any open tab hears of a new version.
  useEffect(() => watchForNewVersion(), []);

  const theme = editorTheme ?? "light";

  return (
    <Toaster
      richColors
      theme={theme}
      style={theme === "light" ? LIGHT_TOAST_TEXT : undefined}
      mobileOffset={editorTheme ? EDITOR_MOBILE_OFFSET : undefined}
    />
  );
}
