import type { InvoiceItem, InvoiceLabels, TableSettings } from "~/types";

// The Tax column's header: its own label once one is typed, otherwise the tax
// row's, so renaming the row to "VAT" renames the column too.
export function getTaxColumnLabel(
  columnLabels: TableSettings["columnLabels"],
  labels: Pick<InvoiceLabels, "tax">
): string {
  return columnLabels.tax || labels.tax;
}

// Which of the optional columns show. Unit goes with quantity and price, and
// prints (in the PDF and Preview) only once a line has a unit, so invoices
// that never use one keep the narrower table. While editing it shows anyway,
// so there's somewhere to type one.
export function getShownColumns({
  columns,
  items,
  isPrinted
}: {
  columns: TableSettings["columns"];
  items: Pick<InvoiceItem, "unit">[];
  isPrinted: boolean;
}): TableSettings["columns"] {
  const hasUnits = items.some(item => item.unit.trim() !== "");

  return {
    quantityAndPrice: columns.quantityAndPrice,
    unit: columns.quantityAndPrice && columns.unit && (!isPrinted || hasUnits)
  };
}
