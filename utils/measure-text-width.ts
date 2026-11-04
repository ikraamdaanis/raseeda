import type { CSSProperties } from "react";

// A character's advance, in ems, guessed where there's no canvas to measure
// with (on the server): wide enough for any font's figures.
const FALLBACK_EM_PER_CHARACTER = 0.65;

let context: CanvasRenderingContext2D | null = null;

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

  context.font = `${style.fontWeight ?? 400} ${fontSize}px ${style.fontFamily ?? "sans-serif"}`;

  return context.measureText(text).width + spacing;
}
