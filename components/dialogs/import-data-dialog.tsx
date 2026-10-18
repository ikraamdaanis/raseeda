import {
  IconAlertTriangle,
  IconCircleCheck,
  IconUpload
} from "@tabler/icons-react";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import { APP_NAME } from "~/consts/app";
import type { ExportFile, ImportAnalysis, ImportResult } from "~/types";
import {
  analyzeImport,
  executeImport,
  parseExportFile
} from "~/utils/import-data";
import { track } from "~/utils/track";

type ImportState = "idle" | "analyzing" | "preview" | "importing" | "done";

export function ImportDataDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [parsedData, setParsedData] = useState<ExportFile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bumped on every close so an import that is still running in the background
  // can tell it belongs to a dismissed dialog and skip flipping the (now reset)
  // dialog to a stale done/error screen.
  const importGenerationRef = useRef(0);

  function handleClose() {
    importGenerationRef.current++;
    onOpenChange(false);
    setState("idle");
    setError(null);
    setAnalysis(null);
    setParsedData(null);
    setResult(null);
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setState("analyzing");

    try {
      const parsed = await parseExportFile(file);
      setParsedData(parsed);

      const importAnalysis = await analyzeImport(parsed);
      setAnalysis(importAnalysis);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
      setState("idle");
    }

    // Reset the file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!parsedData) return;

    const generation = importGenerationRef.current;
    setState("importing");
    setError(null);

    try {
      const importResult = await executeImport(parsedData);

      track("data_imported");

      if (generation !== importGenerationRef.current) return;

      setResult(importResult);
      setState("done");
    } catch (err) {
      if (generation !== importGenerationRef.current) return;

      setError(err instanceof Error ? err.message : "Failed to import data.");
      setState("preview");
    }
  }

  const hasConflicts =
    analysis &&
    (analysis.templates.conflicts.length > 0 ||
      analysis.invoices.conflicts.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import invoices, templates, and images from a {APP_NAME} export
            file.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 py-2">
          {state === "idle" && (
            <div className="flex flex-col items-center gap-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-surface w-full p-3 text-sm">
                  {error}
                </div>
              )}
              <label
                htmlFor="import-file-input"
                className="border-border rounded-surface flex w-full cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-4 transition-colors hover:bg-zinc-100/70"
              >
                <IconUpload className="text-muted-foreground h-8 w-8" />
                <span className="text-sm font-medium">
                  Select a .json export file
                </span>
                <span className="text-muted-foreground text-xs">
                  Click to browse files
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="import-file-input"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {state === "analyzing" && (
            <div className="flex items-center justify-center py-4">
              <p className="text-muted-foreground">Analyzing file...</p>
            </div>
          )}

          {state === "preview" && analysis && (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-surface p-3 text-sm">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="rounded-surface flex items-center justify-between border p-3">
                  <span className="text-sm">Templates</span>
                  <span className="text-muted-foreground text-sm">
                    {analysis.templates.total} total
                    {analysis.templates.conflicts.length > 0 &&
                      ` (${analysis.templates.conflicts.length} to rename)`}
                  </span>
                </div>
                <div className="rounded-surface flex items-center justify-between border p-3">
                  <span className="text-sm">Invoices</span>
                  <span className="text-muted-foreground text-sm">
                    {analysis.invoices.total} total
                    {analysis.invoices.conflicts.length > 0 &&
                      ` (${analysis.invoices.conflicts.length} to rename)`}
                  </span>
                </div>
                <div className="rounded-surface flex items-center justify-between border p-3">
                  <span className="text-sm">Images</span>
                  <span className="text-muted-foreground text-sm">
                    {analysis.images.total} total
                  </span>
                </div>
              </div>
              {hasConflicts && (
                <div className="rounded-surface flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                  <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    Some names already exist and will be renamed with an
                    &quot;(imported)&quot; suffix.
                  </span>
                </div>
              )}
            </div>
          )}

          {state === "importing" && (
            <div className="flex items-center justify-center py-4">
              <p className="text-muted-foreground">Importing data...</p>
            </div>
          )}

          {state === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-4">
              <IconCircleCheck className="h-10 w-10 text-green-600" />
              <p className="text-center text-sm">
                Successfully imported {result.invoicesImported} invoice
                {result.invoicesImported !== 1 ? "s" : ""},{" "}
                {result.templatesImported} template
                {result.templatesImported !== 1 ? "s" : ""}, and{" "}
                {result.imagesImported} image
                {result.imagesImported !== 1 ? "s" : ""}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            {state === "done" ? "Done" : "Cancel"}
          </Button>
          {state === "preview" && (
            <Button onClick={handleImport}>Import</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
