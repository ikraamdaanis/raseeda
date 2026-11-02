import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  useTransition
} from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "~/components/dialogs/confirm-delete-dialog";
import { DeleteAllDataDialog } from "~/components/dialogs/delete-all-data-dialog";
import { ImportDataDialog } from "~/components/dialogs/import-data-dialog";
import { OpenInvoiceDialog } from "~/components/dialogs/open-invoice-dialog";
import { OpenTemplateDialog } from "~/components/dialogs/open-template-dialog";
import { RenameInvoiceDialog } from "~/components/dialogs/rename-invoice-dialog";
import { SaveTemplateModal } from "~/components/dialogs/save-template-modal";
import { VersionHistoryDialog } from "~/components/dialogs/version-history-dialog";
import {
  DocumentNotFoundError,
  useInvoiceDocument
} from "~/context/invoice-document-context";
import {
  deleteTemplate,
  getAllTemplates,
  renameInvoice,
  renameTemplate
} from "~/db";
import { useDocumentStore } from "~/stores/document-store";
import { useInvoiceDataAndActions } from "~/stores/invoice-selectors";
import type { InvoiceDocument, InvoiceTemplate } from "~/types";
import { exportAllData } from "~/utils/export-data";
import { hasOpenModal } from "~/utils/open-overlay";
import { hasPrimaryModifier } from "~/utils/shortcut-label";
import { track } from "~/utils/track";

// Everything the editor can do with files: new, open, duplicate, templates,
// version history, import, export and deleting it all. The project menu, the invoices panel
// and the command palette all call these, so the dialogs behave the same
// whichever one started the action. Every invoice saves itself, so nothing
// here asks about unsaved changes: switching invoice writes the open one
// first.
const FileActionsContext = createContext<{
  pending: boolean;
  newInvoice: () => void;
  showOpenInvoice: () => void;
  openInvoice: (documentId: string) => void;
  // ⌘S: writes the open invoice now and says it's saved.
  saveNow: () => void;
  duplicateCurrent: () => void;
  showVersionHistory: () => void;
  showOpenTemplate: () => void;
  applyTemplate: (template: InvoiceTemplate) => void;
  saveAsTemplate: () => void;
  exportData: () => void;
  importData: () => void;
  deleteAllData: () => void;
  renameInvoice: (document: InvoiceDocument) => void;
  duplicateInvoice: (document: InvoiceDocument) => void;
  deleteInvoice: (document: InvoiceDocument) => void;
  renameTemplate: (template: InvoiceTemplate) => void;
  deleteTemplate: (template: InvoiceTemplate) => void;
} | null>(null);

// A saved invoice or template that a row's menu is acting on.
type LibraryTarget =
  | { kind: "invoice"; document: InvoiceDocument }
  | { kind: "template"; template: InvoiceTemplate };

function targetName(target: LibraryTarget) {
  return target.kind === "invoice"
    ? target.document.name
    : target.template.name;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { invoice } = useInvoiceDataAndActions();
  const {
    currentDocumentId,
    libraryDocumentId,
    isRecord,
    status,
    openInvoice,
    newInvoice,
    applyTemplate,
    duplicateInvoice,
    duplicateCurrent,
    deleteFromLibrary,
    deleteEverything,
    flushNow
  } = useInvoiceDocument();
  const { open: openRequest } = useSearch({ from: "/create" });
  const navigate = useNavigate();
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [pending, startTransition] = useTransition();
  // The rename and delete dialogs keep their target after closing, so their
  // text doesn't blank out while they fade; opening one replaces it.
  const [renameDialog, setRenameDialog] = useState<{
    target: LibraryTarget | null;
    open: boolean;
  }>({ target: null, open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    target: LibraryTarget | null;
    open: boolean;
  }>({ target: null, open: false });
  const renameTarget = renameDialog.target;
  const deleteTarget = deleteDialog.target;

  function run(action: () => Promise<unknown>, failure: string) {
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        toast.error(errorMessage(error, failure));
      }
    });
  }

  function handleOpenInvoice(documentId: string) {
    if (documentId === currentDocumentId) return;

    run(async () => {
      try {
        await openInvoice(documentId);
      } catch (error) {
        if (error instanceof DocumentNotFoundError) {
          toast.error("That invoice was deleted");

          return;
        }

        throw error;
      }
    }, "Failed to open invoice");
  }

  // A link to `/create?open=invoices` lands here. The param is cleared so a
  // reload doesn't reopen the list.
  const onOpenRequested = useEffectEvent(() => {
    setOpenDialogOpen(true);
    void navigate({
      to: "/create",
      search: previous => ({ ...previous, open: undefined }),
      replace: true
    });
  });

  useEffect(() => {
    if (openRequest === "invoices") onOpenRequested();
  }, [openRequest]);

  // ⌘S has nothing to save, since everything already saves itself; it writes
  // whatever is waiting and confirms. A failure shows in the save banner.
  async function handleSaveNow() {
    const { status: currentStatus } = useDocumentStore.getState();

    if (currentStatus === "readOnly") {
      toast("This invoice is being edited in another tab", {
        id: "save-now"
      });

      return;
    }

    if (currentStatus !== "editing") return;

    if (await flushNow())
      toast.success("Saved", { id: "save-now", duration: 1500 });
  }

  function handleDuplicateCurrent() {
    if (!isRecord || status !== "editing") return;

    run(async () => {
      const copy = await duplicateCurrent();

      if (copy) toast.success(`Duplicated as “${copy.name}”`);
    }, "Failed to duplicate invoice");
  }

  function handleExport() {
    run(async () => {
      await exportAllData();
      track("data_exported");
      toast.success("Data exported successfully");
    }, "Failed to export data");
  }

  async function handleDeleteAll() {
    try {
      await deleteEverything();
      setTemplates([]);
      toast.success("All data deleted");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete the data"));

      throw error;
    }
  }

  useEffect(() => {
    async function loadTemplates() {
      try {
        setTemplates(await getAllTemplates());
      } catch {
        // The template list stays as it was.
      }
    }
    loadTemplates();
  }, [saveTemplateDialogOpen]);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!hasPrimaryModifier(event)) return;

    // Compare case-insensitively: holding Shift reports an uppercase key, so
    // "s" would never match on Cmd+Shift+S without normalising first. Cmd+N is
    // intentionally not bound because Chrome and Safari reserve it for a new
    // browser window and never surface it to the page.
    const key = event.key.toLowerCase();

    if (key !== "o" && key !== "s") return;

    // ⌘S never opens the browser's Save Page, even under a dialog.
    event.preventDefault();

    // A modal dialog owns keyboard focus; file shortcuts stand down under it.
    // A held key repeats; once is enough.
    if (hasOpenModal() || event.repeat) return;

    if (key === "o" && !event.shiftKey) {
      setOpenDialogOpen(true);
    } else if (key === "s" && !event.shiftKey) {
      void handleSaveNow();
    } else if (key === "s" && event.shiftKey && !pending) {
      handleDuplicateCurrent();
    }
  });

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      handleKeyDown(event);
    }

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, []);

  async function handleLibraryRename(newName: string) {
    if (!renameTarget) return;

    if (renameTarget.kind === "invoice") {
      await renameInvoice(renameTarget.document.id, newName);
      toast.success("Invoice renamed");
    } else {
      await renameTemplate(renameTarget.template.id, newName);
      toast.success("Template renamed");
    }
  }

  async function handleLibraryDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === "invoice") {
        await deleteFromLibrary([deleteTarget.document.id]);
        toast.success("Invoice deleted");
      } else {
        await deleteTemplate(deleteTarget.template.id);
        toast.success("Template deleted");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete"));
    }
  }

  function handleDuplicateInvoice(document: InvoiceDocument) {
    run(async () => {
      const copy = await duplicateInvoice(document);

      toast.success(`Duplicated as “${copy.name}”`);
    }, "Failed to duplicate invoice");
  }

  const value = {
    pending,
    newInvoice: () => run(newInvoice, "Failed to start a new invoice"),
    showOpenInvoice: () => setOpenDialogOpen(true),
    openInvoice: handleOpenInvoice,
    saveNow: () => void handleSaveNow(),
    duplicateCurrent: handleDuplicateCurrent,
    showVersionHistory: () => setVersionsOpen(true),
    showOpenTemplate: () => setTemplateDialogOpen(true),
    applyTemplate: (template: InvoiceTemplate) =>
      run(() => applyTemplate(template), "Failed to apply template"),
    saveAsTemplate: () => setSaveTemplateDialogOpen(true),
    exportData: handleExport,
    importData: () => setImportDialogOpen(true),
    deleteAllData: () => setDeleteAllOpen(true),
    renameInvoice: (document: InvoiceDocument) =>
      setRenameDialog({ target: { kind: "invoice", document }, open: true }),
    duplicateInvoice: handleDuplicateInvoice,
    deleteInvoice: (document: InvoiceDocument) =>
      setDeleteDialog({ target: { kind: "invoice", document }, open: true }),
    renameTemplate: (template: InvoiceTemplate) =>
      setRenameDialog({ target: { kind: "template", template }, open: true }),
    deleteTemplate: (template: InvoiceTemplate) =>
      setDeleteDialog({ target: { kind: "template", template }, open: true })
  };

  return (
    <FileActionsContext.Provider value={value}>
      {children}
      <OpenInvoiceDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        onSelectInvoice={invoiceDoc => handleOpenInvoice(invoiceDoc.id)}
        currentInvoiceId={libraryDocumentId}
        onDeleteInvoices={deleteFromLibrary}
        onDuplicateInvoice={handleDuplicateInvoice}
      />
      <OpenTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelectTemplate={value.applyTemplate}
      />
      <SaveTemplateModal
        open={saveTemplateDialogOpen}
        onOpenChange={setSaveTemplateDialogOpen}
        currentInvoiceData={invoice}
        templates={templates}
      />
      <VersionHistoryDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
      />
      <RenameInvoiceDialog
        open={renameDialog.open}
        onOpenChange={open => {
          if (!open) setRenameDialog(prev => ({ ...prev, open: false }));
        }}
        currentName={renameTarget ? targetName(renameTarget) : ""}
        subject={renameTarget?.kind === "template" ? "Template" : "Invoice"}
        onRename={handleLibraryRename}
      />
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={open => {
          if (!open) setDeleteDialog(prev => ({ ...prev, open: false }));
        }}
        subject={deleteTarget?.kind ?? "invoice"}
        name={deleteTarget ? targetName(deleteTarget) : ""}
        onConfirm={handleLibraryDelete}
      />
      <ImportDataDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <DeleteAllDataDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onExport={handleExport}
        onConfirm={handleDeleteAll}
      />
    </FileActionsContext.Provider>
  );
}

export function useFileActions() {
  const context = useContext(FileActionsContext);

  if (!context) {
    throw new Error("useFileActions must be used within a FileActionsProvider");
  }

  return context;
}
