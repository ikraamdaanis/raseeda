import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconFileCheck,
  IconFileImport,
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
  DialogIcon,
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

// What the import added, leaving out what it added none of.
function describeImport(result: ImportResult) {
  const counts = [
    [result.invoicesImported, "document"],
    [result.templatesImported, "template"],
    [result.imagesImported, "image"]
  ] as const;
  const parts = counts
    .filter(([count]) => count > 0)
    .map(([count, noun]) => `${count} ${noun}${count === 1 ? "" : "s"}`);

  if (parts.length === 0) return "The file had nothing new to add.";

  return `Added ${new Intl.ListFormat("en").format(parts)} to this browser.`;
}

// "48 KB", or "1.2 MB" from a megabyte up, and never "0 KB".
function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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
  // The file the preview was read from, kept when going back so it can be
  // read again with Next or swapped for another. Pasted JSON stays in its field.
  const [chosenFile, setChosenFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter and dragleave fire for every child the pointer crosses, so the
  // drop zone stays lit until the drag has left the dialog as a whole.
  const dragDepthRef = useRef(0);
  // Bumped on every close so an import that is still running in the background
  // can tell it belongs to a dismissed dialog and skip flipping the (soon
  // reset) dialog to a stale done/error screen.
  const importGenerationRef = useRef(0);

  function handleClose() {
    importGenerationRef.current++;
    onOpenChange(false);
  }

  // Back to the first step once the dialog has faded, so the step it closed on
  // stays in place on the way out.
  function resetDialog() {
    setState("idle");
    setError(null);
    setAnalysis(null);
    setParsedData(null);
    setResult(null);
    setPastedText("");
    setChosenFile(null);
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

      if (typeof source === "string") {
        setChosenFile(null);
      } else {
        setChosenFile({ name: source.name, size: source.size });
        setPastedText("");
      }

      setState("preview");
    } catch (err) {
      // A file that can't be read takes the place of the one chosen before.
      setParsedData(null);
      setAnalysis(null);
      setChosenFile(null);
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
      setState("idle");
    }
  }

  // Editing JSON that was read drops what was read from it, so Next can't
  // import the text as it was before the edit.
  function handlePastedTextChange(text: string) {
    setPastedText(text);

    if (chosenFile !== null) return;

    setParsedData(null);
    setAnalysis(null);
  }

  // Back to choosing, with the file or pasted JSON still there.
  function handleBack() {
    setError(null);
    setState("idle");
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
  // Reading a file keeps the first step's layout, the drop zone showing a
  // spinner in place of its contents, so the dialog doesn't change height.
  const isAnalyzing = state === "analyzing";
  // Lighting up for a drag takes over from the chosen file's name.
  const showsChosenFile =
    chosenFile !== null && !isAnalyzing && !isDraggingFile;
  const canContinue = state === "idle" && analysis !== null;

  const isDone = state === "done" && result !== null;
  const analysisRows = analysis
    ? [
        {
          label: "Documents",
          total: analysis.invoices.total,
          renamed: analysis.invoices.conflicts.length
        },
        {
          label: "Templates",
          total: analysis.templates.total,
          renamed: analysis.templates.conflicts.length
        },
        { label: "Images", total: analysis.images.total, renamed: 0 }
      ]
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      onOpenChangeComplete={isOpen => {
        if (!isOpen) resetDialog();
      }}
    >
      <DialogContent
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        <DialogHeader
          icon={
            isDone ? (
              <DialogIcon
                tone="success"
                className="animate-in fade-in-0 zoom-in-90 duration-200 ease-(--ease-out-strong)"
              >
                <IconCheck />
              </DialogIcon>
            ) : (
              <DialogIcon tone="neutral">
                <IconFileImport />
              </DialogIcon>
            )
          }
        >
          <DialogTitle>
            {isDone ? "Import complete" : "Import data"}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {isDone
              ? describeImport(result)
              : `Bring back documents, templates and images from a ${APP_NAME} export file.`}
          </DialogDescription>
        </DialogHeader>
        {!isDone && (
          <div className="px-4 py-2">
            {(state === "idle" || isAnalyzing) && (
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
                    "rounded-surface grid w-full place-items-center border-2 border-dashed p-4 transition-colors",
                    isDraggingFile
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/20"
                      : "border-border"
                  )}
                >
                  <div
                    inert={isAnalyzing}
                    className={cn(
                      "col-start-1 row-start-1 flex flex-col items-center gap-2",
                      (isAnalyzing || showsChosenFile) && "invisible"
                    )}
                  >
                    <IconUpload
                      aria-hidden="true"
                      className={cn(
                        "size-6",
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
                  {showsChosenFile && (
                    <div className="col-start-1 row-start-1 flex w-full min-w-0 flex-col items-center gap-2">
                      <IconFileCheck
                        aria-hidden="true"
                        className="text-brand-600 dark:text-brand-400 size-6"
                      />
                      <span className="flex max-w-full min-w-0 items-baseline gap-1.5 text-sm">
                        <span className="truncate font-medium">
                          {chosenFile.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {formatFileSize(chosenFile.size)}
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose a different file
                      </Button>
                    </div>
                  )}
                  {isAnalyzing && (
                    <div
                      role="status"
                      className="text-muted-foreground col-start-1 row-start-1 flex items-center gap-2 text-sm"
                    >
                      <IconLoader2
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                      Reading the export…
                    </div>
                  )}
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
                    onChange={event =>
                      handlePastedTextChange(event.target.value)
                    }
                    placeholder='{ "meta": { … }, "invoices": [ … ] }'
                    spellCheck={false}
                    autoComplete="off"
                    rows={3}
                    readOnly={isAnalyzing}
                    className="max-h-32 font-mono text-xs md:text-xs"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-end"
                    disabled={isAnalyzing || !pastedText.trim()}
                    onClick={() => void analyzeSource(pastedText)}
                  >
                    Use pasted JSON
                  </Button>
                </div>
              </div>
            )}
            {(state === "preview" || isImporting) && analysis && (
              <div className="flex flex-col gap-3">
                {error && (
                  <div
                    role="alert"
                    className="bg-destructive/10 text-destructive rounded-surface p-3 text-sm"
                  >
                    {error}
                  </div>
                )}
                <dl className="rounded-surface bg-border flex flex-col gap-px overflow-hidden border">
                  {analysisRows.map(row => (
                    <div
                      key={row.label}
                      className="bg-popover flex items-baseline justify-between gap-3 px-3 py-2.5"
                    >
                      <dt className="text-sm">{row.label}</dt>
                      <dd className="text-sm tabular-nums">
                        {row.total}
                        {row.renamed > 0 && (
                          <span className="text-muted-foreground">
                            {` (${row.renamed} renamed)`}
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {hasConflicts && (
                  <div className="rounded-surface flex items-start gap-2 bg-amber-50 p-3 dark:bg-amber-950">
                    <IconAlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <span className="text-sm text-pretty text-amber-800 dark:text-amber-200">
                      Some names are already in use here, so those copies get
                      &ldquo;(imported)&rdquo; added to their name.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {isDone ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              {(state === "preview" || isImporting) && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isImporting}
                  className="sm:mr-auto"
                >
                  <IconArrowLeft data-icon="inline-start" />
                  Back
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              {canContinue && (
                <Button onClick={() => setState("preview")}>Next</Button>
              )}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
