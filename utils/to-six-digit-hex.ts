// A whole hex code, with or without its "#": three digits or six.
export const HEX_COLOUR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

let context: CanvasRenderingContext2D | null = null;

// A colour as a colour input wants it, all six digits. A stored colour can be
// any CSS colour (one set through the automation API, say), which the browser
// reads for us; one it can't read, or any colour on the server, is black.
export function toSixDigitHex(colour: string) {
  const match = HEX_COLOUR.exec(colour.trim());

  if (match) {
    const digits = match[1].toLowerCase();

    return digits.length === 3
      ? `#${Array.from(digits, digit => digit + digit).join("")}`
      : `#${digits}`;
  }

  if (typeof document !== "undefined") {
    context ??= document.createElement("canvas").getContext("2d");
  }

  if (!context) return "#000000";

  // A colour the canvas can't read leaves the black set before it.
  context.fillStyle = "#000000";
  context.fillStyle = colour;

  const read = String(context.fillStyle);

  if (read.startsWith("#")) return read;

  // A colour with transparency reads as "rgba(r, g, b, a)"; the input has no
  // alpha, so it takes the colour alone.
  const channels = (read.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

  if (channels.length < 3) return "#000000";

  return `#${channels
    .map(channel => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}
