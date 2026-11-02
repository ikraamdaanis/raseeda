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

// Asks before deleting everything stored in this browser, and offers a backup
// first, since none of it can be brought back.
export function DeleteAllDataDialog({
  open,
  onOpenChange,
  onExport,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  // The dialog stays mounted while closed, so the button comes out of its
  // loading state once the dialog has faded.
  function handleClose() {
    onOpenChange(false);
    setTimeout(() => setPending(false), 300);
  }

  async function handleConfirm() {
    setPending(true);

    try {
      await onConfirm();
      handleClose();
    } catch {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && !pending) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader
          icon={
            <DialogIcon tone="destructive">
              <IconTrash />
            </DialogIcon>
          }
        >
          <DialogTitle>Delete all data?</DialogTitle>
          <DialogDescription className="text-pretty">
            Every invoice, template, logo and saved version in this browser
            will be deleted. This can’t be undone, so export your data first if
            you might want it back.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onExport} disabled={pending}>
            Export Data
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={pending}
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90 text-white"
          >
            Delete all data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
