import {
  IconAdjustmentsHorizontal,
  IconFileText,
  IconPencil
} from "@tabler/icons-react";
import type { ComponentProps, ComponentType, KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import {
  STYLE_BUTTON_ID,
  STYLE_TRAY_ID
} from "~/components/editor/shell/style-tray";
import { useEditorUi } from "~/context/editor-ui-context";
import { cn } from "~/lib/utils";

// A field that brings up the on-screen keyboard, which the bar steps aside
// for rather than floating over it. A colour or range input opens no
// keyboard.
const TYPING_FIELD_SELECTOR =
  "input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=color]):not([type=range]), textarea";

const PHONE_VIEWS = [
  { view: "form", label: "Edit", icon: IconPencil },
  { view: "page", label: "Page", icon: IconFileText }
] as const;

// On a phone the editor's views live in one bar along the bottom, as in
// Canva: Edit (the form) and Page (the page as it prints) switch the view, as
// tabs; Style opens its tray over the Page view, switching to it first. The
// invoice list is the screen the editor is pushed over, reached by the top
// bar's back button. On a touch screen the bar hides while a field is being
// typed in, so it never sits on the keyboard, except while the Style tray is
// open: the tray sits on the bar, and hiding it would drop the tray and grow
// the page under it as a colour's picker opens.
export function PhoneTabBar() {
  const { phoneView, setPhoneView, rightPanelOpen, setPanelOpen, closePanels } =
    useEditorUi();
  const isTyping = useIsTyping();

  function toggleStyle() {
    if (rightPanelOpen) {
      closePanels();

      return;
    }

    setPhoneView("page");
    setPanelOpen("right", true);
  }

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
      hidden={isTyping && !rightPanelOpen}
      className="bg-background border-border relative z-30 grid shrink-0 grid-cols-3 border-t px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] md:hidden"
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
              isActive={isSelected && !rightPanelOpen}
              onKeyDown={handleKeyDown}
              onClick={() => selectView(view)}
            />
          );
        })}
      </div>
      <BarButton
        id={STYLE_BUTTON_ID}
        aria-expanded={rightPanelOpen}
        aria-controls={STYLE_TRAY_ID}
        icon={IconAdjustmentsHorizontal}
        label="Style"
        isActive={rightPanelOpen}
        onClick={toggleStyle}
      />
    </nav>
  );
}

// Whether a field that brings up the keyboard has focus, on a touch screen:
// a narrow window on a computer opens no keyboard, so its bar stays.
function useIsTyping() {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    function update() {
      const active = document.activeElement;

      setIsTyping(
        window.matchMedia("(pointer: coarse)").matches &&
          active instanceof HTMLElement &&
          active.matches(TYPING_FIELD_SELECTOR)
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
