import { afterEach, describe, expect, it, vi } from "vitest";
import { saveFile, toFileName } from "~/utils/save-file";

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

describe("saveFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("keeps the blob URL while a phone's download sheet is open", () => {
    vi.useFakeTimers();

    const click = vi.fn();
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", { createElement: () => ({ click }) });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:invoice",
      revokeObjectURL
    });

    saveFile(new Blob(["%PDF"]), "invoice.pdf");

    expect(click).toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);

    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:invoice");
  });
});
