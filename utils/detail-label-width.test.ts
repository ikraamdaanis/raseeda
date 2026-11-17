import { describe, expect, it } from "vitest";
import {
  getDetailLabelWidth,
  getDetailsColumnWidth
} from "~/utils/detail-label-width";

// Six points a character, so the sums are easy to follow.
function measure(label: string) {
  return label.length * 6;
}

describe("getDetailLabelWidth", () => {
  const column = getDetailsColumnWidth("A4");

  it("keeps 40% of the column for short labels, as the PDF always did", () => {
    expect(
      getDetailLabelWidth({
        labels: ["Invoice No.", "Date", "Due date"],
        paperSize: "A4",
        measure
      })
    ).toBeCloseTo(column * 0.4);
  });

  it("widens to the longest label and a gap", () => {
    expect(
      getDetailLabelWidth({
        labels: ["Rechnungsnummer", "Rechnungsdatum", "Fälligkeitsdatum"],
        paperSize: "A4",
        measure
      })
    ).toBe("Fälligkeitsdatum".length * 6 + 12);
  });

  it("leaves the values 40% of the column however long a label is", () => {
    expect(
      getDetailLabelWidth({
        labels: ["A label renamed to something far too long to fit"],
        paperSize: "A4",
        measure
      })
    ).toBeCloseTo(column * 0.6);
  });

  it("splits the page between the client and the details", () => {
    expect(getDetailsColumnWidth("A4")).toBeCloseTo((595.28 - 80 - 40) / 2);
    expect(getDetailsColumnWidth("Letter")).toBe((612 - 80 - 40) / 2);
  });
});
