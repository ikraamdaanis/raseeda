import { IconBug } from "@tabler/icons-react";
import { toast } from "sonner";
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
import { failureMessage } from "~/context/document-session";
import { useFileActions } from "~/context/file-actions-context";
import { getAllInvoices } from "~/db";
import { useDocumentStore } from "~/stores/document-store";
import { seedDummyInvoice } from "~/utils/seed-dummy-invoice";

// Development only (the top bar loads it behind import.meta.env.DEV): shows
// any status alert, toast or dialog on demand, to judge them in place. The
// alerts only change what the editor shows, not the session behind it, so
// Clear alerts puts the editor back as it was.
export function DevMenu() {
  const actions = useFileActions();

  function showAlert(
    state: Partial<ReturnType<typeof useDocumentStore.getState>>
  ) {
    useDocumentStore.setState({
      status: "editing",
      saveFailure: null,
      backupReminder: false,
      ...state
    });
  }

  // Rename and delete act on a saved invoice, so they take the newest one.
  async function withSavedInvoice(
    action: (
      document: Awaited<ReturnType<typeof getAllInvoices>>[number]
    ) => void
  ) {
    const newest = (await getAllInvoices())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .at(0);

    if (!newest) {
      toast.error("Save an invoice first");

      return;
    }

    action(newest);
  }

  async function addDummyInvoice() {
    try {
      await seedDummyInvoice();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add a dummy invoice"
      );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dev menu"
            title="Dev menu"
            className="text-muted-foreground pointer-coarse:size-11"
          />
        }
      >
        <IconBug aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Alerts</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuItem onClick={() => showAlert({ status: "readOnly" })}>
              Open in another tab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showAlert({ status: "deleted" })}>
              Deleted in another tab
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                showAlert({
                  saveFailure: {
                    message: failureMessage(new Error("Write failed")),
                    storageFull: false,
                    episode: Date.now()
                  }
                })
              }
            >
              Couldn’t save
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                showAlert({
                  saveFailure: {
                    message: failureMessage(
                      new DOMException("Storage is full", "QuotaExceededError")
                    ),
                    storageFull: true,
                    episode: Date.now()
                  }
                })
              }
            >
              Storage full
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => showAlert({ status: "reloadRequired" })}
            >
              Updated in another tab
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => showAlert({ status: "unavailable" })}
            >
              Can’t be saved in this browser
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => showAlert({ backupReminder: true })}
            >
              Backup suggestion
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => showAlert({})}>
              Clear alerts
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Toasts</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem onClick={() => toast.success("Invoice renamed")}>
              Success
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.warning("This invoice was changed in another tab")
              }
            >
              Warning
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.error("This invoice couldn't be saved, so it stays open")
              }
            >
              Error
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.success("Data exported successfully");
                toast.success("Template created successfully!");
                toast.error("Reload the page to open another invoice");
              }}
            >
              Several at once
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Dialogs</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuItem onClick={actions.showVersionHistory}>
              Version history
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.saveAsTemplate}>
              Save as template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.importData}>
              Import data
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void withSavedInvoice(actions.renameInvoice)}
            >
              Rename a saved invoice
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                void withSavedInvoice(document =>
                  actions.deleteInvoices([document])
                )
              }
            >
              Delete a saved invoice (asks first)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void addDummyInvoice()}>
          Add a dummy invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
