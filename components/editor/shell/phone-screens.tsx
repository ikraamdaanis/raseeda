import {
  IconArrowLeft,
  IconChevronLeft,
  IconCopy,
  IconCopyPlus,
  IconDeviceFloppy,
  IconDots,
  IconDownload,
  IconHistory,
  IconPalette,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { startCase } from "lodash-es";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { EditorThemeRadioGroup } from "~/components/editor/editor-theme-menu";
import { DocumentsPanel } from "~/components/editor/shell/documents-panel";
import { HistoryMenuRow } from "~/components/editor/shell/history-buttons";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { DOCUMENT_TYPE_NAMES } from "~/consts/document-types";
import { useEditorUi } from "~/context/editor-ui-context";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { cn } from "~/lib/utils";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import { useDocumentType } from "~/stores/invoice-selectors";

// How the phone's list and editor slide as one is pushed over the other, as
// in iOS: the editor comes in from the right while the list drifts a third
// of the way left and dims.
const SCREEN_SLIDE_CLASS_NAME =
  "transition-[translate] duration-300 ease-(--ease-out-strong) motion-reduce:transition-none";

const menuTriggerClassName =
  "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-1";

/**
 * On a phone, the document list as the editor's parent screen (issue #213):
 * the documents panel at full screen, under the editor while a document is open.
 * Showing it writes whatever edit is waiting, so the row just left is up to
 * date.
 */
export function PhoneLibraryScreen() {
  const { isNarrow, leftPanelOpen, phoneSlides } = useEditorUi();
  const { flushNow } = useInvoiceDocument();
  const isShown = isNarrow && leftPanelOpen;

  useEffect(() => {
    if (isShown) void flushNow();
  }, [isShown, flushNow]);

  if (!isNarrow) return null;

  return (
    <section
      aria-label="Documents"
      inert={!isShown}
      className={cn(
        "bg-background absolute inset-0 flex flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
        phoneSlides && SCREEN_SLIDE_CLASS_NAME,
        !isShown && "-translate-x-1/3"
      )}
    >
      <DocumentsPanel headerEnd={<PhoneLibraryMenu />} />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-black/15 opacity-0",
          phoneSlides &&
            "transition-opacity duration-300 motion-reduce:transition-none",
          !isShown && "opacity-100"
        )}
      />
    </section>
  );
}

/**
 * The editor, which on a phone is pushed over the document list and slides off
 * to the right to show it. Elsewhere it's just the editor's column.
 */
export function EditorScreen({ children }: { children: ReactNode }) {
  const { isNarrow, leftPanelOpen, phoneSlides } = useEditorUi();

  if (!isNarrow) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div
      inert={leftPanelOpen}
      className={cn(
        "bg-background absolute inset-0 z-10 flex flex-col",
        phoneSlides && SCREEN_SLIDE_CLASS_NAME,
        leftPanelOpen && "translate-x-full",
        phoneSlides && "shadow-floating"
      )}
    >
      {children}
    </div>
  );
}

// The editor's way back to the document list, its parent screen.
export function PhoneBackButton() {
  const { showPhoneList } = useEditorUi();

  return (
    <Button
      variant="ghost"
      aria-label="Documents"
      onClick={showPhoneList}
      className="text-muted-foreground -ml-2 size-11 shrink-0"
    >
      <IconChevronLeft aria-hidden="true" className="size-6" />
    </Button>
  );
}

// What acts on the whole library, at the top of the document list.
function PhoneLibraryMenu() {
  const actions = useFileActions();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Library menu"
        className={menuTriggerClassName}
      >
        <IconDots aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={actions.importData}
          disabled={actions.pending}
        >
          <IconUpload aria-hidden="true" />
          Import Data
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.exportData}
          disabled={actions.pending}
        >
          <IconDownload aria-hidden="true" />
          Export Data
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={actions.deleteAllData}
          disabled={actions.pending}
        >
          <IconTrash aria-hidden="true" />
          Delete All Data…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconPalette aria-hidden="true" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-36">
            <EditorThemeRadioGroup />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => void navigate({ to: "/" })}>
          <IconArrowLeft aria-hidden="true" />
          Back to homepage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// What acts on the open document, at the top right of the phone's editor,
// with undo and redo across its top while it can be edited.
export function PhoneDocumentMenu() {
  const actions = useFileActions();
  const { isRecord, status } = useInvoiceDocument();
  const documentType = useDocumentType();
  const canDuplicate = !actions.pending && isRecord && status === "editing";
  const canEdit = status === "editing" || status === "unavailable";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Document menu"
        className={menuTriggerClassName}
      >
        <IconDots aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canEdit && (
          <>
            <HistoryMenuRow />
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => actions.duplicateCurrent()}
          disabled={!canDuplicate}
        >
          <IconCopy aria-hidden="true" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!canDuplicate}>
            <IconCopyPlus aria-hidden="true" />
            Duplicate As
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {DOCUMENT_TYPES.filter(otherType => otherType !== documentType).map(
              otherType => (
                <DropdownMenuItem
                  key={otherType}
                  onClick={() => actions.duplicateCurrent(otherType)}
                  disabled={!canDuplicate}
                >
                  {startCase(DOCUMENT_TYPE_NAMES[otherType])}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={actions.showVersionHistory}
          disabled={!isRecord}
        >
          <IconHistory aria-hidden="true" />
          Version History
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.saveAsTemplate}
          disabled={actions.pending}
        >
          <IconDeviceFloppy aria-hidden="true" />
          Save As Template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
