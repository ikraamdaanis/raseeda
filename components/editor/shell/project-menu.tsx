import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconBookmark,
  IconChevronDown,
  IconCommand,
  IconCopy,
  IconDeviceFloppy,
  IconDownload,
  IconFilePlus,
  IconFiles,
  IconFolderOpen,
  IconHistory,
  IconPalette,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { startCase } from "lodash-es";
import { EditorThemeRadioGroup } from "~/components/editor/editor-theme-menu";
import {
  redoLabel,
  undoLabel
} from "~/components/editor/shell/history-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import {
  DOCUMENT_TYPE_NAMES,
  OTHER_DOCUMENT_TYPES
} from "~/consts/document-types";
import { useEditorUi } from "~/context/editor-ui-context";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import {
  redoInvoiceChange,
  undoInvoiceChange,
  useInvoiceHistory
} from "~/stores/invoice-history";
import { shortcutLabel } from "~/utils/shortcut-label";

// The logo opens one menu with everything the old File menu had, plus undo
// and redo and the way back to the homepage, like the project menu in Framer.
// It also carries the theme choice, which phones have no canvas pill for.
// Invoices save themselves, so there's no Save: Duplicate takes Save As's
// place, as in Apple's autosaving apps.
export function ProjectMenu() {
  const actions = useFileActions();
  const { setPaletteOpen } = useEditorUi();
  const { isRecord, status } = useInvoiceDocument();
  const history = useInvoiceHistory();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Project menu"
        className="hover:bg-muted aria-expanded:bg-accent focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-8 shrink-0 items-center gap-0.5 rounded-md pr-1 pl-0.5 outline-none focus-visible:ring-1 pointer-coarse:h-11"
      >
        <img
          src="/favicon.svg"
          alt=""
          className="size-6 rounded-[6px] pointer-coarse:size-8"
        />
        <IconChevronDown aria-hidden="true" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem
          onClick={actions.newInvoice}
          disabled={actions.pending}
        >
          <IconFilePlus aria-hidden="true" />
          New Invoice
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={actions.pending}>
            <IconFiles aria-hidden="true" />
            New Document
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {OTHER_DOCUMENT_TYPES.map(documentType => (
              <DropdownMenuItem
                key={documentType}
                onClick={() => actions.newDocument(documentType)}
                disabled={actions.pending}
              >
                {startCase(DOCUMENT_TYPE_NAMES[documentType])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={actions.showOpenInvoice}
          disabled={actions.pending}
        >
          <IconFolderOpen aria-hidden="true" />
          Open Invoice
          <DropdownMenuShortcut>{shortcutLabel("⌘O")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.duplicateCurrent}
          disabled={actions.pending || !isRecord || status !== "editing"}
        >
          <IconCopy aria-hidden="true" />
          Duplicate
          <DropdownMenuShortcut>{shortcutLabel("⇧⌘S")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.showVersionHistory}
          disabled={!isRecord}
        >
          <IconHistory aria-hidden="true" />
          Version History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => undoInvoiceChange()}
          disabled={!history.canUndo}
        >
          <IconArrowBackUp aria-hidden="true" />
          <span className="truncate">{undoLabel(history.undoLabel)}</span>
          <DropdownMenuShortcut>{shortcutLabel("⌘Z")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => redoInvoiceChange()}
          disabled={!history.canRedo}
        >
          <IconArrowForwardUp aria-hidden="true" />
          <span className="truncate">{redoLabel(history.redoLabel)}</span>
          <DropdownMenuShortcut>{shortcutLabel("⇧⌘Z")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={actions.showOpenTemplate}
          disabled={actions.pending}
        >
          <IconBookmark aria-hidden="true" />
          Open Template
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.saveAsTemplate}
          disabled={actions.pending}
        >
          <IconDeviceFloppy aria-hidden="true" />
          Save As Template
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={actions.exportData}
          disabled={actions.pending}
        >
          <IconDownload aria-hidden="true" />
          Export Data
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={actions.importData}
          disabled={actions.pending}
        >
          <IconUpload aria-hidden="true" />
          Import Data
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
        <DropdownMenuItem onClick={() => setPaletteOpen(true)}>
          <IconCommand aria-hidden="true" />
          Quick actions
          <DropdownMenuShortcut>{shortcutLabel("⌘K")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void navigate({ to: "/" })}>
          <IconArrowLeft aria-hidden="true" />
          Back to homepage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
