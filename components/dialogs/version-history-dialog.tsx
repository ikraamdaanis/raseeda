import { IconHistory } from "@tabler/icons-react";
import { isToday, isYesterday } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIcon,
  DialogTitle
} from "~/components/ui/dialog";
import { formatCurrency, getMoneyFormat } from "~/consts/currencies";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { getInvoiceVersions } from "~/db";
import type { InvoiceVersion, InvoiceVersionReason } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { formatFullDate } from "~/utils/format-list-date";

const REASON_LABELS: Record<InvoiceVersionReason, string> = {
  opened: "When it was opened",
  idle: "While editing",
  beforeRestore: "Before a version was restored",
  beforeRemoval: "Before a large deletion",
  conflict: "Changes made in another tab",
  beforeAutosave: "Before autosave"
};

function formatWhen(date: Date) {
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });

  if (isToday(date)) return `Today, ${time}`;
  if (isYesterday(date)) return `Yesterday, ${time}`;

  return formatFullDate(date);
}

// The open invoice's version history: copies kept when it was opened, after
// pauses in editing and before big changes, as Google Docs and Figma keep
// them. Restoring one keeps the invoice as it is now as a version first, and
// undo takes the restore back.
export function VersionHistoryDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentDocumentId, isRecord, status, restoreVersion } =
    useInvoiceDocument();
  const [versions, setVersions] = useState<InvoiceVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const canRestore = status === "editing";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setVersions(null);
    setError(null);

    if (!currentDocumentId || !isRecord) {
      setVersions([]);

      return;
    }

    getInvoiceVersions(currentDocumentId)
      .then(next => {
        if (!cancelled) setVersions(next);
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Failed to load version history."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentDocumentId, isRecord]);

  async function handleRestore(version: InvoiceVersion) {
    setRestoringId(version.id);

    try {
      await restoreVersion(version);
      onOpenChange(false);
      toast.success("Version restored", {
        description: "Undo puts the invoice back as it was."
      });
    } catch (failure) {
      toast.error(
        failure instanceof Error ? failure.message : "Failed to restore"
      );
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-lg flex-col">
        <DialogHeader
          icon={
            <DialogIcon tone="neutral">
              <IconHistory />
            </DialogIcon>
          }
        >
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription className="text-pretty">
            Earlier versions of this invoice, kept in this browser. Restoring
            one keeps the invoice as it is now as a version too.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-32 flex-col overflow-y-auto px-1 pb-3">
          {error ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              {error}
            </p>
          ) : versions === null ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading versions…
            </p>
          ) : versions.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-4 text-center text-sm">
              <IconHistory aria-hidden="true" className="size-5 opacity-60" />
              <p className="max-w-xs text-pretty">
                No versions yet. They’re kept as you edit, starting the next
                time this invoice is opened.
              </p>
            </div>
          ) : (
            <ul aria-label="Versions" className="flex flex-col gap-1">
              {versions.map(version => {
                const { invoiceData } = version;
                const total = calculateInvoiceTotals(invoiceData).total;

                return (
                  <li
                    key={version.id}
                    className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-foreground truncate text-sm font-medium tabular-nums">
                        {formatWhen(new Date(version.createdAt))}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {`${REASON_LABELS[version.reason]} · ${version.name} · ${formatCurrency(total, getMoneyFormat(invoiceData))}`}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canRestore || restoringId !== null}
                      onClick={() => void handleRestore(version)}
                      aria-label={`Restore the version from ${formatWhen(new Date(version.createdAt))}`}
                    >
                      Restore
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
