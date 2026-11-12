import { IconLayoutSidebar, IconLayoutSidebarRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { useEditorUi } from "~/context/editor-ui-context";
import { cn } from "~/lib/utils";

// A panel beside the canvas that slides closed to nothing. Its content keeps a
// fixed width while the panel animates, so nothing reflows mid-slide. On a
// phone it is a sheet that slides up over the canvas from the tab bar.
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
  const isSheet = isNarrow && open;
  const panelRef = useRef<HTMLElement>(null);

  // A sheet takes focus as it opens, so the keyboard and screen readers start
  // in it rather than on the page it covers, unless something in it already
  // took focus (the invoices panel's search, opened by Open Invoice).
  useEffect(() => {
    const panel = panelRef.current;

    if (isSheet && panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }
  }, [isSheet]);

  return (
    <aside
      ref={panelRef}
      aria-label={label}
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? true : undefined}
      tabIndex={isSheet ? -1 : undefined}
      inert={!open}
      className={cn(
        "bg-background border-border relative shrink-0 overflow-hidden transition-[width,translate] duration-200 ease-out outline-none motion-reduce:transition-none",
        "max-md:shadow-floating max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:h-[min(70dvh,34rem)] max-md:w-full max-md:rounded-t-2xl max-md:border-x-0 max-md:border-t",
        side === "left" ? "w-64 border-r" : "w-72 border-l",
        !open && "w-0 border-0 max-md:translate-y-full max-md:shadow-none"
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col max-md:w-full",
          side === "left" ? "w-64" : "w-72"
        )}
      >
        {children}
      </div>
    </aside>
  );
}

// On a phone the open panel covers the page; tapping the dimmed page beside it
// closes it, like a sheet.
export function PanelBackdrop() {
  const { isNarrow, leftPanelOpen, rightPanelOpen, closePanels } =
    useEditorUi();

  if (!isNarrow || (!leftPanelOpen && !rightPanelOpen)) return null;

  return (
    <button
      type="button"
      aria-label="Close panel"
      onClick={closePanels}
      className="animate-in fade-in-0 absolute inset-0 z-20 bg-black/30 md:hidden"
    />
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
