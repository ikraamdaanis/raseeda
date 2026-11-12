import { IconAppWindow } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/consts/app";
import { askForEditor } from "~/context/editor-lock";
import { documentActions } from "~/context/editor-session";
import { useDocumentStore } from "~/stores/document-store";

// Shown in place of the editor while another tab has it. Use here asks that
// tab to write what's pending and let go. A tab that handed over while its
// writes were failing still holds those edits, so it says so and offers the
// backup that keeps them.
export function EditorElsewhereNotice() {
  const saveFailure = useDocumentStore(state => state.saveFailure);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);

    try {
      await documentActions.downloadBackup();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download a backup"
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="bg-desk flex h-dvh w-full flex-col items-center justify-center gap-6 px-6 text-center">
      <IconAppWindow
        aria-hidden="true"
        className="text-muted-foreground size-8"
      />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-foreground text-lg font-semibold text-balance">
          {APP_NAME} is open in another tab
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          The editor works in one tab at a time. Use it here instead, and the
          other tab saves what it has and steps aside.
        </p>
      </div>
      {saveFailure && (
        <div
          role="alert"
          className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-red-600/10 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200/80"
        >
          <p>{saveFailure.message}</p>
          <Button
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport()}
          >
            Export
          </Button>
        </div>
      )}
      <Button size="lg" onClick={askForEditor}>
        Use here
      </Button>
    </div>
  );
}
