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

  it("keeps a download's blob URL until the next download", () => {
    vi.useFakeTimers();

    const click = vi.fn();
    const revokeObjectURL = vi.fn();
    const urls = ["blob:first", "blob:second"];

    vi.stubGlobal("document", { createElement: () => ({ click }) });
    vi.stubGlobal("URL", {
      createObjectURL: () => urls.shift(),
      revokeObjectURL
    });

    saveFile(new Blob(["%PDF"]), "first.pdf");
    vi.advanceTimersByTime(10 * 60_000);

    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    saveFile(new Blob(["%PDF"]), "second.pdf");

    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:first");
  });
});
