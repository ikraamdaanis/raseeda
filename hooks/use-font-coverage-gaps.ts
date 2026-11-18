import { useInvoiceData } from "~/stores/invoice-selectors";
import { getFontCoverageGaps } from "~/utils/font-coverage";
import { getPrintedText } from "~/utils/printed-text";

// What of the open invoice's printed text its font can't draw (issue #227),
// for the note over the page and the phone form. Null when it all prints.
export function useFontCoverageGaps() {
  const invoice = useInvoiceData();

  return getFontCoverageGaps(invoice.theme.font, getPrintedText(invoice));
}
