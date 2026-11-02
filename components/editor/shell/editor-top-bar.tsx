import { IconPlayerPlay } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { lazy, Suspense, useRef, useState } from "react";
import { toast } from "sonner";
import { DownloadPopover } from "~/components/editor/shell/download-popover";
import { HistoryButtons } from "~/components/editor/shell/history-buttons";
import { ProjectMenu } from "~/components/editor/shell/project-menu";
import { Button } from "~/components/ui/button";
import { useEditorUi } from "~/context/editor-ui-context";
import {
  useDocumentName,
  useInvoiceDocument
} from "~/context/invoice-document-context";

// Framer's three-part bar: the project menu on the left, the invoice's name in
// the middle, and the panel toggles, Preview and Download on the right.
// `start` and `end` take the panel toggles. Phones keep the menu, the name,
// undo and redo, and Download; the panel toggles move to the tab bar, and
// there's no Preview there. Every edit saves itself, so there's no save state to show here while
// saving works; problems show in the banner under the bar.
// Development builds get a menu that shows any alert, toast or dialog on
// demand; production builds drop it, import and all.
const DevMenu = import.meta.env.DEV
  ? lazy(() =>
      import("~/components/editor/shell/dev-menu").then(module => ({
        default: module.DevMenu
      }))
    )
  : null;

export function EditorTopBar({
  start,
  end
}: {
  start?: ReactNode;
  end?: ReactNode;
}) {
  const { mode, toggleMode, isNarrow } = useEditorUi();
  const { status } = useInvoiceDocument();
  const canEdit = status === "editing" || status === "unavailable";

  return (
    <header className="bg-background border-border relative z-30 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] max-md:flex max-md:gap-2 pointer-coarse:h-14">
      <div className="flex min-w-0 items-center gap-1 max-md:shrink-0">
        <ProjectMenu />
        <div className="contents max-md:hidden">{start}</div>
      </div>
      <InvoiceName />
      <div className="flex min-w-0 items-center justify-end gap-1 max-md:shrink-0">
        <div className="contents max-md:hidden">{end}</div>
        {isNarrow && mode === "edit" && canEdit && (
          <HistoryButtons className="flex items-center" />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={mode === "preview" ? "Back to editing" : "Preview"}
          aria-pressed={mode === "preview" || !canEdit}
          disabled={!canEdit}
          title="Preview (P)"
          onClick={toggleMode}
          className="text-muted-foreground aria-pressed:bg-accent aria-pressed:text-foreground mr-1 max-md:hidden pointer-coarse:size-11"
        >
          <IconPlayerPlay aria-hidden="true" />
        </Button>
        {DevMenu && (
          <Suspense fallback={null}>
            <DevMenu />
          </Suspense>
        )}
        <DownloadPopover />
      </div>
    </header>
  );
}

// The name is edited where it sits: click it, type, and it's saved on Enter or
// when you click away; Escape keeps the old name. An empty or unchanged name
// isn't saved. Naming a new invoice that isn't in the library yet adds it under
// that name.
function InvoiceName() {
  const { renameCurrent } = useInvoiceDocument();
  const displayName = useDocumentName();
  // The text being typed; null while the name isn't being edited, so a rename
  // from elsewhere shows straight away.
  const [draft, setDraft] = useState<string | null>(null);
  // The name being saved, shown until the save lands so the old name doesn't
  // flash back in between.
  const [savingName, setSavingName] = useState<string | null>(null);
  const isCancellingRef = useRef(false);

  async function handleBlur() {
    const newName = draft?.trim() ?? "";
    const isCancelled = isCancellingRef.current;

    isCancellingRef.current = false;
    setDraft(null);

    if (isCancelled || !newName || newName === displayName) return;

    setSavingName(newName);

    try {
      await renameCurrent(newName);
    } catch {
      toast.error("Couldn't rename the invoice. Please try again.");
    } finally {
      setSavingName(null);
    }
  }

  return (
    <h1 className="flex min-w-0 max-md:flex-1 max-md:justify-center">
      <input
        aria-label="Invoice name"
        title="Rename"
        value={draft ?? savingName ?? displayName}
        maxLength={100}
        spellCheck={false}
        onFocus={event => {
          setDraft(savingName ?? displayName);
          event.currentTarget.select();
        }}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") event.currentTarget.blur();

          if (event.key === "Escape") {
            isCancellingRef.current = true;
            event.currentTarget.blur();
          }
        }}
        onBlur={handleBlur}
        className="text-foreground hover:bg-muted focus:bg-muted focus-visible:ring-ring field-sizing-content h-7 max-w-[min(18rem,36vw)] min-w-12 truncate rounded-md px-2 text-center text-sm font-medium outline-none focus-visible:ring-1 max-md:max-w-full pointer-coarse:h-10"
      />
    </h1>
  );
}
