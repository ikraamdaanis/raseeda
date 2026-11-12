import { describe, expect, it } from "vitest";
import { layoutColumns } from "~/utils/layout-columns";

const LABELS = {
  quantity: "Qty",
  unit: "Unit",
  unitPrice: "Price",
  tax: "VAT",
  amount: "Amount"
};

const ROWS = [
  {
    quantity: "2",
    unit: "hrs",
    unitPrice: "£100.00",
    tax: "20%",
    amount: "£200.00",
    convertedAmount: "¥38,274"
  },
  {
    quantity: "12",
    unit: "",
    unitPrice: "£1,250.00",
    tax: "Exempt",
    amount: "£15,000.00",
    convertedAmount: "¥2,870,550"
  }
];

const ALL_COLUMNS = { quantityAndPrice: true, unit: true, tax: true };

// Every character is 1 wide, headers 2, so a text's width reads off its
// length.
function measure(text: string, part: "header" | "cell") {
  return text.length * (part === "header" ? 2 : 1);
}

// A column's width without spare room: its widest text, a point so rounding
// never wraps it, and the cell's padding.
function bare(textWidth: number) {
  return textWidth + 1 + 10;
}

function getWidths(layout: ReturnType<typeof layoutColumns>) {
  return Object.fromEntries(
    layout.columns.map(column => [column.id, column.width])
  );
}

describe("layoutColumns", () => {
  it("sizes each column by the wider of its header and its widest cell", () => {
    const layout = layoutColumns({
      columns: ALL_COLUMNS,
      rows: ROWS,
      labels: LABELS,
      conversion: null,
      tableWidth: 0,
      measure
    });

    expect(getWidths(layout)).toEqual({
      quantity: bare(6),
      unit: bare(8),
      unitPrice: bare(10),
      tax: bare(6),
      amount: bare(12)
    });
  });

  it("puts the currency codes under the money columns' headers", () => {
    const layout = layoutColumns({
      columns: ALL_COLUMNS,
      rows: ROWS,
      labels: { ...LABELS, amount: "Total" },
      conversion: { fromCode: "GBP", toCode: "JPY" },
      tableWidth: 0,
      measure
    });
    const headers = Object.fromEntries(
      layout.columns.map(column => [column.id, column.header])
    );

    expect(headers.unitPrice).toEqual(["Price", "GBP"]);
    expect(headers.amount).toEqual(["Total", "GBP"]);
    expect(headers.convertedAmount).toEqual(["Total", "JPY"]);
    expect(getWidths(layout).convertedAmount).toBe(bare(10));
  });

  it("shares the spare room evenly, up to its cap", () => {
    const tight = layoutColumns({
      columns: { quantityAndPrice: true, unit: false, tax: false },
      rows: ROWS,
      labels: LABELS,
      conversion: null,
      tableWidth: 100,
      measure
    });
    // 85 of the table is the figures', and they take 17 + 21 + 23 of it,
    // leaving 8 each.
    expect(getWidths(tight)).toEqual({
      quantity: bare(6) + 8,
      unitPrice: bare(10) + 8,
      amount: bare(12) + 8
    });

    const roomy = layoutColumns({
      columns: { quantityAndPrice: true, unit: false, tax: false },
      rows: ROWS,
      labels: LABELS,
      conversion: null,
      tableWidth: 1000,
      measure
    });
    expect(getWidths(roomy)).toEqual({
      quantity: bare(6) + 12,
      unitPrice: bare(10) + 12,
      amount: bare(12) + 12
    });
  });

  it("takes the gaps between columns out of the spare room", () => {
    const layout = layoutColumns({
      columns: { quantityAndPrice: true, unit: false, tax: false },
      rows: ROWS,
      labels: LABELS,
      conversion: null,
      tableWidth: 100,
      columnGap: 2,
      measure
    });

    expect(getWidths(layout).amount).toBe(bare(12) + 6);
    expect(layout.figuresWidth).toBe(61 + 18 + 6);
  });

  it("keeps the description's minimum share before giving any spare room", () => {
    const layout = layoutColumns({
      columns: ALL_COLUMNS,
      rows: ROWS,
      labels: LABELS,
      conversion: { fromCode: "GBP", toCode: "JPY" },
      tableWidth: 100,
      measure
    });

    expect(getWidths(layout)).toEqual({
      quantity: bare(6),
      unit: bare(8),
      unitPrice: bare(10),
      tax: bare(6),
      amount: bare(12),
      convertedAmount: bare(12)
    });
    expect(layout.descriptionMinShare).toBe(0.15);
  });

  it("leaves hidden columns out", () => {
    const layout = layoutColumns({
      columns: { quantityAndPrice: false, unit: false, tax: false },
      rows: ROWS,
      labels: LABELS,
      conversion: null,
      tableWidth: 1000,
      measure
    });

    expect(layout.columns.map(column => column.id)).toEqual(["amount"]);
  });
});
