import { encode } from "uqr";

/**
 * A QR code for some text, made on the device, as its width in modules and
 * one SVG path of its dark modules (each row's runs as rectangles), in module
 * units. Medium error correction, as EPC069-12 asks of a SEPA code. The text
 * is encoded as UTF-8 bytes.
 */
export function getQrCodePath(text: string): { size: number; path: string } {
  const { size, data } = encode(Array.from(new TextEncoder().encode(text)), {
    ecc: "M",
    border: 0
  });
  const commands: string[] = [];

  for (const [row, modules] of data.entries()) {
    let column = 0;

    while (column < size) {
      if (!modules[column]) {
        column++;
        continue;
      }

      const start = column;

      while (column < size && modules[column]) column++;
      commands.push(`M${start} ${row}h${column - start}v1h${start - column}z`);
    }
  }

  return { size, path: commands.join("") };
}
