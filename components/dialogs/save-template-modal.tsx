import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { NativeSelect } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { saveTemplate } from "~/db";
import "~/lib/configure-zod";
import type { Invoice, InvoiceTemplate } from "~/types";
import { track } from "~/utils/track";

const saveTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
  description: z.string().optional()
});

type SaveTemplateFormData = z.infer<typeof saveTemplateSchema>;

const Keys = z.union([z.string(), z.number(), z.symbol()]);

const _updateTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
  description: z.string().optional(),
  templateData: z.record(Keys, z.unknown()),
  isDefault: z.boolean().default(false),
  screenshotUrl: z.string().optional()
});

export type UpdateTemplateData = z.infer<typeof _updateTemplateSchema>;

const _createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
  description: z.string().optional(),
  templateData: z.record(Keys, z.unknown()),
  isDefault: z.boolean().default(false),
  screenshotUrl: z.string().optional()
});

export type CreateTemplateData = z.infer<typeof _createTemplateSchema>;

/**
 * SaveTemplateModal allows users to create a new invoice template or overwrite
 * an existing one with the current invoice data. It provides a form for naming
 * and describing the template, with an option to select an existing template
 * to overwrite.
 */
export function SaveTemplateModal({
  open,
  templates,
  onOpenChange,
  currentInvoiceData
}: {
  open: boolean;
  templates: InvoiceTemplate[];
  onOpenChange: (open: boolean) => void;
  currentInvoiceData: Invoice;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("new");
  // Set once saved and kept while the dialog fades, so its buttons never show
  // pressable again on the way out.
  const [hasSaved, setHasSaved] = useState(false);
  const isBusy = pending || hasSaved;

  const selectedTemplate = templates.find(
    template => template.id === selectedTemplateId
  );

  const form = useForm<SaveTemplateFormData>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: {
      name: selectedTemplate?.name || "",
      description: selectedTemplate?.description || ""
    },
    values: {
      name: selectedTemplate?.name || "",
      description: selectedTemplate?.description || ""
    }
  });

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  // Reset after every close (Cancel, Escape, overlay click, successful save)
  // so a previously selected overwrite target never carries into the next
  // open, once the dialog has faded so the reset isn't seen.
  function handleOpenChangeComplete(isOpen: boolean) {
    if (isOpen) return;

    setSelectedTemplateId("new");
    setHasSaved(false);
    form.reset();
  }

  function handleSubmit(data: SaveTemplateFormData) {
    startTransition(async () => {
      try {
        const now = new Date();

        if (selectedTemplateId !== "new") {
          // Update existing template
          const existingTemplate = templates.find(
            template => template.id === selectedTemplateId
          );

          if (!existingTemplate) {
            throw new Error("Template not found");
          }

          const updatedTemplate: InvoiceTemplate = {
            ...existingTemplate,
            name: data.name.trim(),
            description: data.description?.trim() || null,
            templateData: currentInvoiceData,
            updatedAt: now
          };

          await saveTemplate(updatedTemplate);

          toast.success("Template updated successfully!");
        } else {
          // Create new template
          const newTemplate: InvoiceTemplate = {
            id: crypto.randomUUID(),
            name: data.name.trim(),
            description: data.description?.trim() || null,
            templateData: currentInvoiceData,
            isDefault: false,
            screenshotUrl: null,
            createdAt: now,
            updatedAt: now
          };

          await saveTemplate(newTemplate);
          track("template_saved");

          toast.success("Template created successfully!");
        }

        setHasSaved(true);
        handleOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save template"
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a new template or overwrite an existing one with the current
            invoice data.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4 py-2"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className="flex flex-col gap-2">
              <FormLabel htmlFor="template-select">Template</FormLabel>
              <NativeSelect
                id="template-select"
                value={selectedTemplateId}
                onChange={({ target: { value } }) =>
                  handleTemplateSelect(value)
                }
                className="max-md:h-11 max-md:text-base max-md:leading-11"
              >
                <option value="new">Create New Template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Template Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter template name"
                      {...field}
                      className="max-md:h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter template description (optional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isBusy}
          >
            {selectedTemplateId !== "new"
              ? "Update Template"
              : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
