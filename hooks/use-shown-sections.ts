import { useShallow } from "zustand/react/shallow";
import { useEditorUi } from "~/context/editor-ui-context";
import { useDocumentStore } from "~/stores/document-store";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceSectionKey } from "~/types";
import { getTypeSections } from "~/utils/document-type";
import { getPrintedSections } from "~/utils/section-visibility";

// Whether the page reads like the PDF, with nothing to edit: in Preview, and
// whenever this tab can't edit the invoice (another tab is editing it, or it
// was deleted), when the page shows it as it prints.
export function useIsPreview() {
  const { mode } = useEditorUi();
  const canEdit = useDocumentStore(
    state => state.status === "editing" || state.status === "unavailable"
  );

  return mode === "preview" || !canEdit;
}

// Which optional parts the page shows right now. While editing that's every
// switched-on section (empty ones too, so there's somewhere to type), as the
// document's type settles them; in Preview it's only what the PDF prints, read
// from the same rules the PDF uses.
export function useShownSections(): Record<InvoiceSectionKey, boolean> {
  const isPreview = useIsPreview();
  const sections = useInvoiceStore(
    useShallow(state => getTypeSections(state.sections, state.documentType))
  );
  const printed = useInvoiceStore(useShallow(getPrintedSections));

  return isPreview ? printed : sections;
}
