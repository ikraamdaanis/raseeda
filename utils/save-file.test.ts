import { describe, expect, it } from "vitest";
import { toFileName } from "~/utils/save-file";

describe("toFileName", () => {
  it("keeps an ordinary invoice name", () => {
    expect(toFileName("INV-0042 · Acme Ltd", "invoice")).toBe(
      "INV-0042 · Acme Ltd"
    );
  });

  it("replaces characters a file name can't hold", () => {
    expect(toFileName('FRL/0013: "Acme"?', "invoice")).toBe(
      "FRL-0013- -Acme--"
    );
  });

  it("collapses spaces and drops trailing dots", () => {
    expect(toFileName("  Acme   Ltd.. ", "invoice")).toBe("Acme Ltd");
  });

  it("falls back when nothing is left", () => {
    expect(toFileName(" ... ", "invoice")).toBe("invoice");
  });
});
