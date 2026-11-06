import { describe, expect, it } from "vitest";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { fontHasCharacters } from "~/utils/font-coverage";

// Polish, Czech, Turkish, Romanian, Hungarian, German and the Nordic letters.
const LATIN_EXTENDED =
  "ŁłŹźŻżĄąĘęŃńŚśĆćŘřČčŠšŽžĎďŤťŇňŮůĞğİıŞşȘșȚțĂăÂâÎîŐőŰűẞßÆæØøÅå";

describe("fontHasCharacters", () => {
  it("covers Latin Extended letters in every invoice font", () => {
    for (const font of INVOICE_FONTS) {
      expect(fontHasCharacters(font.id, LATIN_EXTENDED)).toBe(true);
    }
  });

  it("covers Vietnamese, Cyrillic and Greek where the family has them", () => {
    expect(fontHasCharacters("inter", "Nguyễn Привет Ωμέγα")).toBe(true);
    expect(fontHasCharacters("lora", "Nguyễn Привет")).toBe(true);
    expect(fontHasCharacters("lora", "Ωμέγα")).toBe(false);
    expect(fontHasCharacters("dm-sans", "Nguyễn")).toBe(false);
  });

  it("knows which currency symbols each font draws", () => {
    expect(fontHasCharacters("inter", "₹")).toBe(true);
    expect(fontHasCharacters("lora", "₹")).toBe(false);
    expect(fontHasCharacters("geist", "⃁")).toBe(false);
  });

  it("never claims the narrow no-break space, which no invoice font has", () => {
    for (const font of INVOICE_FONTS) {
      expect(fontHasCharacters(font.id, " ")).toBe(false);
      expect(fontHasCharacters(font.id, " ’")).toBe(true);
    }
  });

  it("covers an empty string", () => {
    expect(fontHasCharacters("inter", "")).toBe(true);
  });
});
