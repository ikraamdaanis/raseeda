import { toSixDigitHex } from "~/utils/to-six-digit-hex";

// The WCAG contrast ratio between a colour and the white page, from 1 (white
// on white) to 21 (black). Any CSS colour is read through toSixDigitHex.
export function getContrastWithWhite(colour: string) {
  const hex = toSixDigitHex(colour);
  const [red, green, blue] = [1, 3, 5].map(start => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;

    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return 1.05 / (luminance + 0.05);
}
