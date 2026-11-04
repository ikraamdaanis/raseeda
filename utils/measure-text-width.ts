import type { CSSProperties } from "react";
import { FALLBACK_EM_PER_CHARACTER } from "~/consts/text-measurement";

let context: CanvasRenderingContext2D | null = null;

// Widths already measured, by font and text. The table re-measures every cell
// on each edit, and almost every cell's text is the same as the last time.
const measured = new Map<string, number>();

// Far more than a table's cells, in every font they've been measured in.
const MEASURED_WIDTHS_MAX = 2000;

// Forgets the widths measured so far, for a caller to measure again once
// fonts load.
export function forgetMeasuredWidths() {
  measured.clear();
}

// How wide a line of text sets in pixels, in a style from getTextStyles. Until
// a web font arrives it measures in the fallback, so a caller re-measures once
// fonts load.
export function measureTextWidth(text: string, style: CSSProperties) {
  const fontSize = Number.parseFloat(String(style.fontSize ?? 16));
  const characters = Array.from(text).length;
  const letterSpacing = String(style.letterSpacing ?? "");
  const spacing =
    (letterSpacing.endsWith("em")
      ? Number.parseFloat(letterSpacing) * fontSize
      : Number.parseFloat(letterSpacing) || 0) * characters;

  if (typeof document !== "undefined") {
    context ??= document.createElement("canvas").getContext("2d");
  }

  if (!context) {
    return characters * FALLBACK_EM_PER_CHARACTER * fontSize + spacing;
  }

  const font = `${style.fontWeight ?? 400} ${fontSize}px ${style.fontFamily ?? "sans-serif"}`;
  const key = `${font}\n${text}`;
  const cached = measured.get(key);

  if (cached !== undefined) return cached + spacing;

  context.font = font;

  const width = context.measureText(text).width;

  // Every draft typed into a figure is a new text, so the cache starts over
  // rather than growing for as long as the page is open.
  if (measured.size >= MEASURED_WIDTHS_MAX) measured.clear();

  // Only once the font is in, so a width measured in the fallback is never
  // kept, however the font's loading and the caller's listener interleave.
  if (document.fonts.check(font)) measured.set(key, width);

  return width + spacing;
}
