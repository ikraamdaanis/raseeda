import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import type { EditorThemePreference } from "~/types";

// The editor's theme choices, in the order every menu lists them. System
// follows the device's light/dark setting and is the default.
export const EDITOR_THEME_OPTIONS: {
  value: EditorThemePreference;
  label: string;
  command: string;
  icon: typeof IconSun;
}[] = [
  {
    value: "system",
    label: "System",
    command: "Match system theme",
    icon: IconDeviceDesktop
  },
  {
    value: "light",
    label: "Light",
    command: "Switch to light mode",
    icon: IconSun
  },
  {
    value: "dark",
    label: "Dark",
    command: "Switch to dark mode",
    icon: IconMoon
  }
];
