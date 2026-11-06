import { FONT_COVERAGE } from "~/consts/font-coverage";
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
