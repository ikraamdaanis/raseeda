import type { Font } from "fontkit";
import { create } from "fontkit";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_COVERAGE } from "~/consts/font-coverage";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";

const ROOT = process.cwd();
const WEIGHTS = [400, 500, 600, 700];

function loadFont(path: string): Font {
  const font = create(readFileSync(path));

  if ("fonts" in font) throw new Error(`${path} is a font collection`);

  return font;
}

function mergedFont(fontId: string, weight: number) {
  return loadFont(
    join(ROOT, "styles", "pdf-fonts", `${fontId}-${weight}.woff`)
  );
}

function latinFont(fontId: string, weight: number) {
  return loadFont(
    join(
      ROOT,
      "node_modules",
      "@fontsource",
      fontId,
      "files",
      `${fontId}-latin-${weight}-normal.woff`
    )
  );
}

function coveredCodePoints(encoded: string): number[] {
  return encoded.split(",").flatMap(range => {
    const [start, end = start] = range
      .split("-")
      .map(point => parseInt(point, 16));

    return Array.from(
      { length: end - start + 1 },
      (_, offset) => start + offset
    );
  });
}

// The files react-pdf embeds, checked with fontkit, the engine it lays text
// out with: what they draw and how they kern is what the PDF prints.
describe("PDF fonts", () => {
  it("are what the PDF registers", () => {
    const registry = readFileSync(
      join(ROOT, "utils", "register-invoice-pdf-fonts.ts"),
      "utf8"
    );

    for (const font of INVOICE_FONTS) {
      for (const weight of WEIGHTS) {
        expect(registry).toContain(
          `~/styles/pdf-fonts/${font.id}-${weight}.woff?url`
        );
      }
    }
    expect(registry).not.toContain("@fontsource");
  });

  it("draw every character the coverage table claims", () => {
    for (const font of INVOICE_FONTS) {
      const points = coveredCodePoints(FONT_COVERAGE[font.id]);

      for (const weight of WEIGHTS) {
        const merged = mergedFont(font.id, weight);
        const missing = points.filter(
          point => !merged.hasGlyphForCodePoint(point)
        );

        expect(missing, `${font.id} ${weight}`).toEqual([]);
      }
    }
  });

  it("set Latin text exactly as Fontsource's Latin files do", () => {
    const text = "AVATAR VAT TAX WAVE Acme Yours Total Lawyer";
    // fontkit can't read Fontsource's own IBM Plex Mono Latin file (the merged
    // one reads fine), and a monospace font has no kerning to lose.
    const comparable = INVOICE_FONTS.filter(
      font => font.id !== "ibm-plex-mono"
    );

    for (const font of comparable) {
      for (const weight of WEIGHTS) {
        const merged = mergedFont(font.id, weight).layout(text);
        const latin = latinFont(font.id, weight).layout(text);

        expect(merged.advanceWidth, `${font.id} ${weight}`).toBe(
          latin.advanceWidth
        );
      }
    }
  });
});
