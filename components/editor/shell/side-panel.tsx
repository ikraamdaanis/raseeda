import { IconLayoutSidebar, IconLayoutSidebarRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { useEditorUi } from "~/context/editor-ui-context";
import { cn } from "~/lib/utils";

// A panel beside the canvas that slides closed to nothing. Its content keeps a
// fixed width while the panel animates, so nothing reflows mid-slide. A phone
// shows both panels in one sheet instead (`PhoneSheet`).
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

const PHONE_PANELS = [
  { side: "left", label: "Invoices" },
  { side: "right", label: "Inspector" }
] as const;

// On a phone, Invoices and Style share one sheet that slides up from the tab
// bar. Switching between them while it's open slides one panel out and the
// other in, in the order the bar lists them, rather than closing one sheet and
// opening another; opening it shows the panel at once. Closing keeps the last
// panel in place as it slides down.
// It clips rather than hides what overflows, so focus moving into the panel out
// of view (or a menu opening) can't scroll the sheet sideways.
export function PhoneSheet({
  invoices,
  inspector
}: {
  invoices: ReactNode;
  inspector: ReactNode;
}) {
  const { isNarrow, leftPanelOpen, rightPanelOpen } = useEditorUi();
  const active = rightPanelOpen ? "right" : leftPanelOpen ? "left" : null;
  const [shown, setShown] = useState({
    active,
    side: active ?? "left",
    slides: false
  });
  const sheetRef = useRef<HTMLElement>(null);
  const isOpen = active !== null;
  const label = PHONE_PANELS.find(panel => panel.side === shown.side)?.label;

  if (active !== shown.active) {
    setShown({
      active,
      side: active ?? shown.side,
      slides: shown.active !== null && active !== null
    });
  }

  // The sheet takes focus as it opens or switches, so the keyboard and screen
  // readers start in the panel shown rather than on the page it covers,
  // unless something in it already took focus (the invoices panel's search,
  // opened by Open Invoice).
  useEffect(() => {
    const sheet = sheetRef.current;
    const panel = sheet?.querySelector(`[data-panel="${active}"]`);

    if (sheet && panel && !panel.contains(document.activeElement)) {
      sheet.focus({ preventScroll: true });
    }
  }, [active]);

  if (!isNarrow) return null;

  return (
    <aside
      ref={sheetRef}
      role={isOpen ? "dialog" : undefined}
      aria-modal={isOpen ? true : undefined}
      aria-label={label}
      tabIndex={isOpen ? -1 : undefined}
      inert={!isOpen}
      className={cn(
        "bg-background border-border shadow-floating absolute inset-x-0 bottom-0 z-30 h-[min(70dvh,34rem)] overflow-clip rounded-t-2xl border-t transition-[translate] duration-200 ease-out outline-none motion-reduce:transition-none",
        !isOpen && "translate-y-full shadow-none"
      )}
    >
      <div
        className={cn(
          "flex h-full w-[200%]",
          shown.slides &&
            "transition-[translate] duration-300 ease-(--ease-out-strong) motion-reduce:transition-none",
          shown.side === "right" && "-translate-x-1/2"
        )}
      >
        {PHONE_PANELS.map(panel => (
          <div
            key={panel.side}
            data-panel={panel.side}
            inert={panel.side !== shown.side}
            className="flex h-full min-h-0 w-1/2 flex-col"
          >
            {panel.side === "left" ? invoices : inspector}
          </div>
        ))}
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
