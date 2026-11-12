import { clamp, sum } from "lodash-es";
import type { CurrencyConversion, InvoiceLineItemRow } from "~/types";

// However long the figures, the description keeps some of the table.
const DESCRIPTION_MIN_SHARE = 0.15;

// Room a column has beyond its text: the space between one column's figures
// and the next column's.
const CELL_PADDING = 10;

// Room a column takes beyond that where the table has it, so the figures
// don't crowd. A table short of room gives it up before the description
// gives up its share.
const COLUMN_SPARE_WIDTH = 12;

// The line-item table's columns, for the canvas and the PDF alike, in the
// units the measurer and the table's width share. Every column but the
// description holds its header lines and each row's figure, and is as wide as
// the widest of them plus its padding; the spare room the description's share
// leaves is split evenly between them, up to its cap. `columnGap` is the
// space a medium puts between columns besides their padding.
export function layoutColumns({
  columns,
  rows,
  labels,
  conversion,
  tableWidth,
  columnGap = 0,
  measure
}: {
  columns: { quantityAndPrice: boolean; unit: boolean; tax: boolean };
  rows: Pick<
    InvoiceLineItemRow,
    "quantity" | "unit" | "unitPrice" | "tax" | "amount" | "convertedAmount"
  >[];
  labels: {
    quantity: string;
    unit: string;
    unitPrice: string;
    tax: string;
    amount: string;
  };
  conversion: Pick<CurrencyConversion, "fromCode" | "toCode"> | null;
  tableWidth: number;
  columnGap?: number;
  measure: (text: string, part: "header" | "cell") => number;
}) {
  const fromCode = conversion ? [conversion.fromCode] : [];
  const shownColumns = [
    {
      id: "quantity" as const,
      isShown: columns.quantityAndPrice,
      header: [labels.quantity],
      cells: rows.map(row => row.quantity)
    },
    {
      id: "unit" as const,
      isShown: columns.unit,
      header: [labels.unit],
      cells: rows.map(row => row.unit)
    },
    {
      id: "unitPrice" as const,
      isShown: columns.quantityAndPrice,
      header: [labels.unitPrice, ...fromCode],
      cells: rows.map(row => row.unitPrice)
    },
    {
      id: "tax" as const,
      isShown: columns.tax,
      header: [labels.tax],
      cells: rows.map(row => row.tax)
    },
    {
      id: "amount" as const,
      isShown: true,
      header: [labels.amount, ...fromCode],
      cells: rows.map(row => row.amount)
    },
    {
      id: "convertedAmount" as const,
      isShown: conversion !== null,
      header: [labels.amount, conversion?.toCode ?? ""],
      cells: rows.map(row => row.convertedAmount ?? "")
    }
  ].filter(column => column.isShown);
  const measured = shownColumns.map(({ id, header, cells }) => {
    const textWidth = Math.max(
      0,
      ...header.map(line => measure(line, "header")),
      ...cells.map(cell => measure(cell, "cell"))
    );

    // A point spare, so rounding never pushes a figure onto a second line.
    return {
      id,
      header,
      cells,
      width: Math.ceil(textWidth) + 1 + CELL_PADDING
    };
  });
  const gapsWidth = columnGap * measured.length;
  const freeWidth =
    tableWidth * (1 - DESCRIPTION_MIN_SHARE) -
    sum(measured.map(column => column.width)) -
    gapsWidth;
  const spareWidth = clamp(
    freeWidth / Math.max(1, measured.length),
    0,
    COLUMN_SPARE_WIDTH
  );
  const laidOut = measured.map(column => ({
    ...column,
    width: column.width + spareWidth
  }));

  return {
    columns: laidOut,
    // What the figures and the gaps beside them take of the table.
    figuresWidth: sum(laidOut.map(column => column.width)) + gapsWidth,
    descriptionMinShare: DESCRIPTION_MIN_SHARE
  };
}
