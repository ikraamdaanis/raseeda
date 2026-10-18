import type { EditorTheme, EditorThemePreference } from "~/types";

// The editor's light/dark choice lives in localStorage, so it survives reloads
// and applies in every tab. It only themes the editor: the attribute and class
// below are set while /create is open and removed when it closes.
export const EDITOR_THEME_STORAGE_KEY = "editor-theme";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

// The browser bar follows the editor's top bar while the editor is open.
const EDITOR_THEME_COLOR: Record<EditorTheme, string> = {
  light: "#fcfcfc",
  dark: "#161616"
};

export function isEditorThemePreference(
  value: unknown
): value is EditorThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readEditorThemePreference(): EditorThemePreference {
  try {
    const stored = localStorage.getItem(EDITOR_THEME_STORAGE_KEY);

    return isEditorThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

// Returns false when storage is blocked (some private windows, site data
// turned off), so the caller can hold the choice in memory instead.
export function writeEditorThemePreference(
  preference: EditorThemePreference
): boolean {
  try {
    localStorage.setItem(EDITOR_THEME_STORAGE_KEY, preference);

    return true;
  } catch {
    return false;
  }
}

export function prefersDarkScheme() {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

export function watchDarkScheme(onChange: () => void) {
  const media = window.matchMedia(DARK_SCHEME_QUERY);
  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

export function resolveEditorTheme(
  preference: EditorThemePreference,
  prefersDark: boolean
): EditorTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";

  return preference;
}

function themeColorMeta() {
  return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
}

export function applyEditorTheme(theme: EditorTheme) {
  const root = document.documentElement;
  root.dataset.editorTheme = theme;
  root.classList.toggle("dark", theme === "dark");

  const meta = themeColorMeta();
  if (!meta) return;
  meta.dataset.siteColor ??= meta.content;
  meta.content = EDITOR_THEME_COLOR[theme];
}

export function clearEditorTheme() {
  const root = document.documentElement;
  delete root.dataset.editorTheme;
  root.classList.remove("dark");

  const meta = themeColorMeta();
  if (!meta?.dataset.siteColor) return;
  meta.content = meta.dataset.siteColor;
  delete meta.dataset.siteColor;
}

// Runs in the /create route's <head> on a full page load, so the editor paints
// in the right scheme from the first frame instead of flashing light. A
// client-side navigation to /create doesn't run head scripts; useEditorTheme
// applies the same thing in a layout effect there.
export const EDITOR_THEME_SCRIPT = `(function(){var preference="system";try{preference=localStorage.getItem(${JSON.stringify(EDITOR_THEME_STORAGE_KEY)})||"system"}catch(error){}var dark=preference==="dark"||(preference!=="light"&&matchMedia(${JSON.stringify(DARK_SCHEME_QUERY)}).matches);var root=document.documentElement;root.setAttribute("data-editor-theme",dark?"dark":"light");root.classList.toggle("dark",dark)})()`;
