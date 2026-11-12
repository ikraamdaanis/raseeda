import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
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

// Asks before deleting saved invoices or templates (one, or a selection),
// since nothing in IndexedDB can be brought back.
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  subject,
  names,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: "invoice" | "template";
  names: string[];
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const onlyName = names.length === 1 ? names[0] : null;
  const what =
    onlyName === null ? `${names.length} ${subject}s` : `this ${subject}`;

  async function handleConfirm() {
    setPending(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          icon={
            <DialogIcon tone="destructive">
              <IconTrash />
            </DialogIcon>
          }
        >
          <DialogTitle>Delete {what}?</DialogTitle>
          <DialogDescription className="text-pretty">
            {onlyName === null ? "They" : `“${onlyName}”`} will be removed from
            this browser. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={pending}
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90 text-white"
          >
            Delete {onlyName === null ? `${subject}s` : subject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
