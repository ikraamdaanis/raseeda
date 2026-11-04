import type { CSSProperties } from "react";
import { FALLBACK_EM_PER_CHARACTER } from "~/consts/text-measurement";

let context: CanvasRenderingContext2D | null = null;

// Widths already measured, by font and text. The table re-measures every cell
// on each edit, and almost every cell's text is the same as the last time.
const measured = new Map<string, number>();

// Forgets the widths measured so far. Until a web font arrives text measures
// in the fallback, so a caller forgets them once fonts load and measures
// again.
export function forgetMeasuredWidths() {
  measured.clear();
}

// How wide a line of text sets in pixels, in a style from getTextStyles.
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

  measured.set(key, width);

  return width + spacing;
}
