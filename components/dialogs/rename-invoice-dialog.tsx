import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import "~/lib/configure-zod";

function renameSchema(subject: string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, `${subject} name is required`)
      .max(100, `${subject} name must be less than 100 characters`)
  });
}

type RenameInvoiceFormData = z.infer<ReturnType<typeof renameSchema>>;

// Renames a saved invoice, or a template when `subject` says so.
export function RenameInvoiceDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
  subject = "Invoice"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (newName: string) => Promise<void>;
  subject?: "Invoice" | "Template";
}) {
  const [pending, setPending] = useState(false);

  const form = useForm<RenameInvoiceFormData>({
    resolver: zodResolver(renameSchema(subject)),
    defaultValues: { name: currentName }
  });

  // Start every open from the name being renamed, selected so typing replaces
  // it: here once the name is in, and on focus for when the dialog's own focus
  // handling lands after this (as it does opened from another dialog). Done on
  // open rather than after close, so the closing dialog keeps its text while it
  // fades and a quick reopen is never overwritten by a late reset.
  useEffect(() => {
    if (!open) return;

    form.reset({ name: currentName });
    setPending(false);
    const frame = requestAnimationFrame(() =>
      form.setFocus("name", { shouldSelect: true })
    );

    return () => cancelAnimationFrame(frame);
  }, [open, currentName, form]);

  async function handleSubmit(data: RenameInvoiceFormData) {
    setPending(true);

    try {
      await onRename(data.name.trim());
      onOpenChange(false);
    } catch (error) {
      setPending(false);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to rename ${subject.toLowerCase()}`
      );
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {subject}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="flex flex-col gap-4 px-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`Enter ${subject.toLowerCase()} name`}
                        autoFocus
                        onFocus={event => event.currentTarget.select()}
                        data-1p-ignore
                        {...field}
                        className="max-md:h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
