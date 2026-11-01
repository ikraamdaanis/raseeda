import { buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { EDITOR_THEME_OPTIONS } from "~/consts/editor-theme-options";
import { useEditorTheme } from "~/hooks/use-editor-theme";
import { cn } from "~/lib/utils";
import { isEditorThemePreference } from "~/utils/editor-theme";

// The canvas pill's theme button: shows the current choice and opens System,
// Light and Dark.
export function EditorThemeMenu() {
  const { preference } = useEditorTheme();
  const selected =
    EDITOR_THEME_OPTIONS.find(option => option.value === preference) ??
    EDITOR_THEME_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Theme: ${selected.label}`}
        title="Theme"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "aria-expanded:bg-accent pointer-coarse:size-11"
        )}
      >
        <selected.icon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="w-36">
        <EditorThemeRadioGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Shared by this menu and the project menu's Theme submenu.
export function EditorThemeRadioGroup() {
  const { preference, setPreference } = useEditorTheme();

  return (
    <DropdownMenuRadioGroup
      value={preference}
      onValueChange={(value: unknown) => {
        if (isEditorThemePreference(value)) setPreference(value);
      }}
    >
      {EDITOR_THEME_OPTIONS.map(option => (
        <DropdownMenuRadioItem
          key={option.value}
          value={option.value}
          closeOnClick
        >
          <option.icon aria-hidden="true" />
          {option.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
