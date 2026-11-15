import type { TextSettings } from "~/types";
import { getFontWeight } from "~/utils/get-font-weight";
import { scaleFontSize } from "~/utils/scale-font-size";

function resolveLetterSpacing(
  letterSpacing: string | undefined,
  fontSize: number,
  isPdf: boolean
): string | number | undefined {
  if (!letterSpacing) {
    return undefined;
  }

  if (!isPdf) {
    return letterSpacing;
  }

  if (letterSpacing.endsWith("em")) {
    return parseFloat(letterSpacing) * fontSize;
  }

  return letterSpacing;
}

// In the editor the size is also set as --text-size, which a phone reads to
// type the page's fields at 16px or more (globals.css); `minSize` gives the
// size those fields show at, for measuring them.
export function getTextStyles({
  settings,
  remove = [],
  isPdf = false,
  minSize = 0
}: {
  settings: Partial<TextSettings>;
  remove?: (keyof TextSettings)[];
  isPdf?: boolean;
  minSize?: number;
}) {
  const fontSize = isPdf
    ? scaleFontSize(settings.size || 0)
    : Number.parseFloat(settings.size || "0");
  const styles: Record<string, string | number | undefined> = {
    color: settings.color,
    fontSize: isPdf
      ? fontSize
      : `${fontSize < minSize ? minSize : settings.size}px`,
    "--text-size": isPdf ? undefined : `${settings.size}px`,
    fontWeight: getFontWeight(settings.weight ?? "Normal"),
    textAlign: settings.align,
    fontFamily: settings.fontFamily,
    fontVariantNumeric: settings.fontFamily?.includes("mono")
      ? "tabular-nums"
      : undefined,
    letterSpacing: resolveLetterSpacing(settings.letterSpacing, fontSize, isPdf)
  };

  if (remove.includes("color")) {
    delete styles.color;
  }

  if (remove.includes("size")) {
    delete styles.fontSize;
    delete styles["--text-size"];
  }

  if (remove.includes("weight")) {
    delete styles.fontWeight;
  }

  if (remove.includes("align")) {
    delete styles.textAlign;
  }

  return styles;
}
