import { IconLayoutSidebar, IconLayoutSidebarRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { useEditorUi } from "~/context/editor-ui-context";
import { cn } from "~/lib/utils";

// A panel beside the canvas that slides closed to nothing. Its content keeps a
// fixed width while the panel animates, so nothing reflows mid-slide. A phone
// has neither: its invoice list is a screen of its own and its style a tray
// over the page (`PhoneLibraryScreen`, `StyleTray`).
export function SidePanel({
  side,
  label,
  children
}: {
  side: "left" | "right";
  label: string;
  children: ReactNode;
}) {
  const { isNarrow, leftPanelOpen, rightPanelOpen } = useEditorUi();
  const open = side === "left" ? leftPanelOpen : rightPanelOpen;

  if (isNarrow) return null;

  return (
    <aside
      aria-label={label}
      inert={!open}
      className={cn(
        "bg-background border-border relative shrink-0 overflow-hidden transition-[width] duration-200 ease-out outline-none motion-reduce:transition-none",
        side === "left" ? "w-64 border-r" : "w-72 border-l",
        !open && "w-0 border-0"
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col",
          side === "left" ? "w-64" : "w-72"
        )}
      >
        {children}
      </div>
    </aside>
  );
}

export function PanelToggle({ side }: { side: "left" | "right" }) {
  const { leftPanelOpen, rightPanelOpen, togglePanel } = useEditorUi();
  const open = side === "left" ? leftPanelOpen : rightPanelOpen;
  const name = side === "left" ? "invoices panel" : "inspector";
  const Icon = side === "left" ? IconLayoutSidebar : IconLayoutSidebarRight;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`${open ? "Hide" : "Show"} ${name}`}
      aria-pressed={open}
      onClick={() => togglePanel(side)}
      className="text-muted-foreground aria-pressed:text-foreground pointer-coarse:size-11"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
