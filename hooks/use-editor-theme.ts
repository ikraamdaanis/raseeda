import { useLayoutEffect, useSyncExternalStore } from "react";
import type { EditorThemePreference } from "~/types";
import {
  EDITOR_THEME_STORAGE_KEY,
  applyEditorTheme,
  clearEditorTheme,
  prefersDarkScheme,
  readEditorThemePreference,
  resolveEditorTheme,
  watchDarkScheme,
  writeEditorThemePreference
} from "~/utils/editor-theme";

// Components reading the theme re-render when it changes: from a menu here,
// another tab (the storage event) or the operating system's scheme.
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === EDITOR_THEME_STORAGE_KEY) listener();
  }

  window.addEventListener("storage", handleStorage);
  const stopWatchingScheme = watchDarkScheme(listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
    stopWatchingScheme();
  };
}

// A choice that couldn't be stored; it lasts until the page closes.
let unstoredPreference: EditorThemePreference | null = null;

function getPreference() {
  return unstoredPreference ?? readEditorThemePreference();
}

function setEditorThemePreference(preference: EditorThemePreference) {
  unstoredPreference = writeEditorThemePreference(preference)
    ? null
    : preference;
  notify();
}

export function useEditorTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => "system" as const
  );
  const prefersDark = useSyncExternalStore(
    subscribe,
    prefersDarkScheme,
    () => false
  );
  const theme = resolveEditorTheme(preference, prefersDark);

  return {
    preference,
    theme,
    setPreference: setEditorThemePreference
  };
}

// Mounted once by the /create route: keeps <html> in step with the theme while
// the editor is open, and hands the page back to the site palette on the way
// out. Layout effects, so a client-side navigation into the editor doesn't
// paint a frame in the wrong scheme.
export function useApplyEditorTheme() {
  const { theme } = useEditorTheme();

  useLayoutEffect(() => {
    applyEditorTheme(theme);
  }, [theme]);

  useLayoutEffect(() => clearEditorTheme, []);
}
