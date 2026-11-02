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

export function AppToaster() {
  const editorTheme = useSyncExternalStore(
    subscribe,
    getEditorTheme,
    getServerEditorTheme
  );

  // Mounted once on every page, so any open tab hears of a new version.
  useEffect(() => watchForNewVersion(), []);

  return (
    <Toaster
      richColors
      theme={editorTheme ?? "light"}
      mobileOffset={editorTheme ? EDITOR_MOBILE_OFFSET : undefined}
    />
  );
}
