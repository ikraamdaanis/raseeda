import {
  IconAdjustmentsHorizontal,
  IconFileText,
  IconFiles,
  IconPencil
} from "@tabler/icons-react";
import type { ComponentProps, ComponentType, KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import { useEditorUi } from "~/context/editor-ui-context";
import { cn } from "~/lib/utils";

// A field that brings up the on-screen keyboard, which the bar steps aside
// for rather than floating over it.
const TYPING_FIELD_SELECTOR =
  "input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea";

const PHONE_VIEWS = [
  { view: "form", label: "Edit", icon: IconPencil },
  { view: "page", label: "Page", icon: IconFileText }
] as const;

// On a phone the editor's views and panels live in one bar along the bottom,
// as in Canva: Edit (the form) and Page (the page as it prints) switch the
// view, as tabs; Invoices and Style open their sheets over either view. The
// top bar keeps only the menu, the name, undo and redo, and Download. The bar
// hides while a field is being typed in, so it never sits on the keyboard.
export function PhoneTabBar() {
  const {
    phoneView,
    setPhoneView,
    leftPanelOpen,
    rightPanelOpen,
    togglePanel,
    closePanels
  } = useEditorUi();
  const isTyping = useIsTyping();

  function selectView(view: (typeof PHONE_VIEWS)[number]["view"]) {
    closePanels();
    setPhoneView(view);
  }

  // Arrow keys move between the two tabs, as in any tab list.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const next = phoneView === "form" ? "page" : "form";

    selectView(next);
    document.getElementById(`phone-tab-${next}`)?.focus();
  }

  return (
    <nav
      aria-label="Editor"
      hidden={isTyping}
      className="bg-background border-border relative z-30 grid shrink-0 grid-cols-4 border-t px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div
        role="tablist"
        aria-label="View"
        className="col-span-2 grid grid-cols-2"
      >
        {PHONE_VIEWS.map(({ view, label, icon }) => {
          const isSelected = phoneView === view;

          return (
            <BarButton
              key={view}
              id={`phone-tab-${view}`}
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              icon={icon}
              label={label}
              isActive={isSelected && !leftPanelOpen && !rightPanelOpen}
              onKeyDown={handleKeyDown}
              onClick={() => selectView(view)}
            />
          );
        })}
      </div>
      <BarButton
        aria-haspopup="dialog"
        aria-expanded={leftPanelOpen}
        icon={IconFiles}
        label="Invoices"
        isActive={leftPanelOpen}
        onClick={() => togglePanel("left")}
      />
      <BarButton
        aria-haspopup="dialog"
        aria-expanded={rightPanelOpen}
        icon={IconAdjustmentsHorizontal}
        label="Style"
        isActive={rightPanelOpen}
        onClick={() => togglePanel("right")}
      />
    </nav>
  );
}

// Whether a field that brings up the keyboard has focus.
function useIsTyping() {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    function update() {
      const active = document.activeElement;

      setIsTyping(
        active instanceof HTMLElement && active.matches(TYPING_FIELD_SELECTOR)
      );
    }

    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);

    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return isTyping;
}

function BarButton({
  icon: Icon,
  label,
  isActive,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "text-muted-foreground focus-visible:ring-ring flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-inset",
        isActive && "text-foreground",
        className
      )}
    >
      <Icon aria-hidden={true} className="size-5" />
      {label}
    </button>
  );
}
