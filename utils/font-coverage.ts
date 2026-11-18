import { FONT_COVERAGE } from "~/consts/font-coverage";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import type { InvoiceFont } from "~/types";

const rangesByFont = new Map<InvoiceFont, [number, number][]>();

function getRanges(font: InvoiceFont): [number, number][] {
  const cached = rangesByFont.get(font);

  if (cached) return cached;

  const ranges = FONT_COVERAGE[font]
    .split(",")
    .map((part): [number, number] => {
      const [start, end = start] = part.split("-");

      return [parseInt(start, 16), parseInt(end, 16)];
    });

  rangesByFont.set(font, ranges);

  return ranges;
}

function coversCodePoint(ranges: [number, number][], codePoint: number) {
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = ranges[middle];

    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }

  return false;
}

// Whether the invoice font draws every character of the text, in the PDF and
// on the page alike. Both use the same font files' coverage (generated into
// consts/font-coverage.ts), so they always agree.
export function fontHasCharacters(font: InvoiceFont, text: string): boolean {
  const ranges = getRanges(font);

  for (const character of text) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined || !coversCodePoint(ranges, codePoint)) {
      return false;
    }
  }

  return true;
}

// Line breaks and tabs print as space, so no font needs a glyph for them.
const LAYOUT_CHARACTERS = new Set(["\n", "\r", "\t"]);

// The characters of the text the invoice font has no glyph for, each once, in
// the order they first appear. react-pdf has no font fallback, so these print
// as junk in the PDF, though the page shows them in a system font.
export function getUndrawableCharacters(
  font: InvoiceFont,
  text: string
): string[] {
  const ranges = getRanges(font);
  const missing = new Set<string>();

  for (const character of text) {
    if (LAYOUT_CHARACTERS.has(character)) continue;

    const codePoint = character.codePointAt(0);

    if (codePoint !== undefined && !coversCodePoint(ranges, codePoint)) {
      missing.add(character);
    }
  }

  return [...missing];
}

// What the invoice's font can't print of its text, split into the characters
// another invoice font draws and those none does (emoji, scripts no invoice
// font has), and the fonts that draw every one of the first, in the order the
// font picker lists them. Null when the font draws it all.
export function getFontCoverageGaps(
  font: InvoiceFont,
  text: string
): {
  characters: string[];
  unprintable: string[];
  fonts: InvoiceFont[];
} | null {
  const missing = getUndrawableCharacters(font, text);

  if (missing.length === 0) return null;

  const others = INVOICE_FONTS.map(definition => definition.id).filter(
    id => id !== font
  );
  const unprintable = missing.filter(character =>
    others.every(id => !fontHasCharacters(id, character))
  );
  const characters = missing.filter(
    character => !unprintable.includes(character)
  );

  return {
    characters,
    unprintable,
    fonts:
      characters.length === 0
        ? []
        : others.filter(id => fontHasCharacters(id, characters.join("")))
  };
}
