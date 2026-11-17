import { clamp } from "lodash-es";
import type { InvoicePaperSize } from "~/types";
import { PDF_PAGE_PADDING, PDF_PAGE_SIZES } from "~/utils/pdf-styles";

// The space between the client's column and the details column, in points.
export const DETAILS_COLUMN_GAP = 40;

// The space between the longest label and its value.
const LABEL_GAP = 12;

// However short the labels, they keep 40% of the column, as they always had,
// so English invoices print as before; however long, the values keep 40%.
const LABEL_MIN_SHARE = 0.4;
const LABEL_MAX_SHARE = 0.6;

// The details column's width on the page: half of it, beside the client.
export function getDetailsColumnWidth(paperSize: InvoicePaperSize) {
  return (
    (PDF_PAGE_SIZES[paperSize].width -
      PDF_PAGE_PADDING * 2 -
      DETAILS_COLUMN_GAP) /
    2
  );
}

// How wide the details rows' labels are, in points, for the canvas and the
// PDF alike (issue #225): as wide as the longest label and a gap, between 40%
// and 60% of the column, so every value starts at the same place and a long
// label such as "Rechnungsnummer" fits on one line. A label past 60% wraps.
// `measure` gives a label's width in points.
export function getDetailLabelWidth({
  labels,
  paperSize,
  measure
}: {
  labels: string[];
  paperSize: InvoicePaperSize;
  measure: (label: string) => number;
}) {
  const columnWidth = getDetailsColumnWidth(paperSize);
  const widest = Math.max(0, ...labels.map(label => measure(label)));

  return clamp(
    widest + LABEL_GAP,
    columnWidth * LABEL_MIN_SHARE,
    columnWidth * LABEL_MAX_SHARE
  );
}
