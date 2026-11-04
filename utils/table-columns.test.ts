import { describe, expect, it } from "vitest";
import {
  getAmountColumnLabel,
  getShownColumns,
  getTaxColumnLabel
} from "~/utils/table-columns";

const LABELS = {
  description: "Item",
  quantity: "Quantity",
  unit: "Unit",
  unitPrice: "Unit Price",
  tax: "",
  amount: ""
};

describe("getTaxColumnLabel", () => {
  it("follows the tax row's label while it has none of its own", () => {
    expect(getTaxColumnLabel(LABELS, { tax: "VAT" })).toBe("VAT");
  });

  it("uses its own label once one is typed", () => {
    expect(getTaxColumnLabel({ ...LABELS, tax: "Rate" }, { tax: "VAT" })).toBe(
      "Rate"
    );
  });
});

describe("getAmountColumnLabel", () => {
  it("reads Net amount while the tax section is on", () => {
    expect(getAmountColumnLabel(LABELS, true)).toBe("Net amount");
  });

  it("reads Amount while the tax section is off", () => {
    expect(getAmountColumnLabel(LABELS, false)).toBe("Amount");
  });

  it("uses its own label once one is typed", () => {
    expect(getAmountColumnLabel({ ...LABELS, amount: "Total" }, true)).toBe(
      "Total"
    );
  });
});

describe("getShownColumns", () => {
  const withUnit = [{ unit: "hrs" }, { unit: "" }];
  const withoutUnit = [{ unit: " " }];
  const allOn = { quantityAndPrice: true, unit: true };

  it("shows the unit while editing, and prints it once a line has one", () => {
    expect(
      getShownColumns({ columns: allOn, items: withoutUnit, isPrinted: false })
    ).toEqual({ quantityAndPrice: true, unit: true });
    expect(
      getShownColumns({ columns: allOn, items: withoutUnit, isPrinted: true })
    ).toEqual({ quantityAndPrice: true, unit: false });
    expect(
      getShownColumns({ columns: allOn, items: withUnit, isPrinted: true })
    ).toEqual({ quantityAndPrice: true, unit: true });
  });

  it("hides the unit when it's switched off", () => {
    expect(
      getShownColumns({
        columns: { quantityAndPrice: true, unit: false },
        items: withUnit,
        isPrinted: false
      })
    ).toEqual({ quantityAndPrice: true, unit: false });
  });

  it("takes the unit with quantity and price", () => {
    expect(
      getShownColumns({
        columns: { quantityAndPrice: false, unit: true },
        items: withUnit,
        isPrinted: true
      })
    ).toEqual({ quantityAndPrice: false, unit: false });
  });
});
