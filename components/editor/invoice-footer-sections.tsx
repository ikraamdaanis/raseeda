import {
  AddPartSlot,
  useAddableParts
} from "~/components/editor/invoice-add-part";
import { InvoiceLatePayment } from "~/components/editor/invoice-late-payment";
import { InvoiceNotes } from "~/components/editor/invoice-notes";
import { InvoiceTerms } from "~/components/editor/invoice-terms";
import { useShownSections } from "~/hooks/use-shown-sections";
import { useSectionsSlice } from "~/stores/invoice-selectors";

/**
 * The optional sections at the foot of the invoice, in their fixed order. Each
 * shows while its section is switched on; the hover "×" beside a label
 * switches it off again, keeping what was typed, and the footer's slot below
 * them adds the ones that are off.
 */
export function InvoiceFooterSections() {
  const { setSection } = useSectionsSlice();
  const sections = useShownSections();
  const addableParts = useAddableParts("footer");

  return (
    <>
      {sections.notes && (
        <div className="mt-6">
          <InvoiceNotes onRemove={() => setSection("notes", false)} />
        </div>
      )}
      {sections.terms && (
        <div className="mt-6">
          <InvoiceTerms onRemove={() => setSection("terms", false)} />
        </div>
      )}
      {sections.latePayment && (
        <div className="mt-6">
          <InvoiceLatePayment
            onRemove={() => setSection("latePayment", false)}
          />
        </div>
      )}
      <AddPartSlot
        areaName="footer"
        parts={addableParts}
        className="-mx-1 mt-6"
      />
    </>
  );
}
