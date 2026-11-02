import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
  IconUpload
} from "@tabler/icons-react";
import type { ChangeEvent, ClipboardEvent, DragEvent } from "react";
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
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { APP_NAME } from "~/consts/app";
import { cn } from "~/lib/utils";
import type { ExportFile, ImportAnalysis, ImportResult } from "~/types";
import {
  analyzeImport,
  executeImport,
  parseExportFile,
  parseExportText
} from "~/utils/import-data";
import { track } from "~/utils/track";

type ImportState = "idle" | "analyzing" | "preview" | "importing" | "done";

// Only a drag that carries files lights up the drop zone; dragging text along
// is left to the browser, so it can still land in the paste field.
function isFileDrag(event: DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

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
  const [pastedText, setPastedText] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter and dragleave fire for every child the pointer crosses, so the
  // drop zone stays lit until the drag has left the dialog as a whole.
  const dragDepthRef = useRef(0);
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
    setPastedText("");
    setIsDraggingFile(false);
    dragDepthRef.current = 0;
  }

  // A chosen, dropped or pasted file and pasted text all take this one path:
  // parse and validate, then preview what the import will do.
  async function analyzeSource(source: File | string) {
    setError(null);
    setState("analyzing");

    try {
      const parsed =
        typeof source === "string"
          ? parseExportText(source)
          : await parseExportFile(source);
      setParsedData(parsed);

      const importAnalysis = await analyzeImport(parsed);
      setAnalysis(importAnalysis);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
      setState("idle");
    }
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Reset the file input so the same file can be re-selected
    event.target.value = "";

    if (!file) return;

    await analyzeSource(file);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;

    event.preventDefault();
    dragDepthRef.current++;
    setIsDraggingFile(state === "idle");
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;

    // Cancelling dragover is what lets the drop land here instead of the
    // browser opening the file in place of the editor.
    event.preventDefault();
    event.dataTransfer.dropEffect = state === "idle" ? "copy" : "none";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);

    if (state !== "idle") return;

    const files = Array.from(event.dataTransfer.files);
    const file = files.at(0);

    if (files.length > 1) {
      setError("Drop one export file at a time.");

      return;
    }

    if (!file) return;

    await analyzeSource(file);
  }

  // Pasting anywhere in the dialog imports what was pasted: a copied file, or
  // the export's JSON as text. In the paste field the pasted text joins what
  // is already there, and the whole field is read.
  async function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (state !== "idle") return;

    const file = Array.from(event.clipboardData.files).at(0);

    if (file) {
      event.preventDefault();
      await analyzeSource(file);

      return;
    }

    const text = event.clipboardData.getData("text/plain");
    if (!text.trim()) return;

    const field = event.target;
    const nextText =
      field instanceof HTMLTextAreaElement
        ? field.value.slice(0, field.selectionStart) +
          text +
          field.value.slice(field.selectionEnd)
        : text;

    // The field is filled here rather than by the browser, so the text is
    // still in it if the import is rejected and the field comes back.
    event.preventDefault();
    setPastedText(nextText);
    await analyzeSource(nextText);
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
  const isImporting = state === "importing";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import invoices, templates, and images from a {APP_NAME} export
            file.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 py-2">
          {state === "idle" && (
            <div className="flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  className="bg-destructive/10 text-destructive rounded-surface w-full p-3 text-sm"
                >
                  {error}
                </div>
              )}
              <div
                role="region"
                aria-label="Drop an export file here"
                data-dragging={isDraggingFile || undefined}
                className={cn(
                  "rounded-surface flex w-full flex-col items-center gap-2 border-2 border-dashed p-4 transition-colors",
                  isDraggingFile
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/20"
                    : "border-border"
                )}
              >
                <IconUpload
                  aria-hidden="true"
                  className={cn(
                    "h-8 w-8",
                    isDraggingFile
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium">
                  {isDraggingFile
                    ? "Drop to import"
                    : "Drop a .json export file here"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose export file
                </Button>
              </div>
              <input
                ref={fileInputRef}
                id="import-file-input"
                type="file"
                accept=".json,application/json"
                aria-label="Export file"
                tabIndex={-1}
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="import-json-input">
                  Or paste the export&apos;s JSON
                </Label>
                <Textarea
                  id="import-json-input"
                  value={pastedText}
                  onChange={event => setPastedText(event.target.value)}
                  placeholder='{ "meta": { … }, "invoices": [ … ] }'
                  spellCheck={false}
                  autoComplete="off"
                  rows={3}
                  className="max-h-32 font-mono text-xs md:text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-end"
                  disabled={!pastedText.trim()}
                  onClick={() => void analyzeSource(pastedText)}
                >
                  Use pasted JSON
                </Button>
              </div>
            </div>
          )}
          {state === "analyzing" && (
            <div className="flex items-center justify-center py-4">
              <p className="text-muted-foreground">Analyzing export...</p>
            </div>
          )}
          {(state === "preview" || isImporting) && analysis && (
            <div className="flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  className="bg-destructive/10 text-destructive rounded-surface p-3 text-sm"
                >
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
          {(state === "preview" || isImporting) && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              aria-busy={isImporting || undefined}
            >
              {isImporting && (
                <IconLoader2
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
