import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { getQrCodePath } from "~/utils/qr-code";

// The dark modules a path draws, read back from its rectangles.
function modulesOf(path: string, size: number) {
  const modules = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  for (const match of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, width] = match.slice(1).map(Number);

    for (let i = 0; i < width; i++) modules[y][x + i] = true;
  }

  return modules;
}

describe("getQrCodePath", () => {
  it("draws every dark module of the code, and nothing else", () => {
    const text = "BCD\n002\n1\nSCT\n\nMüller\nDE89370400440532013000\nEUR1.00";
    const { size, path } = getQrCodePath(text);
    const expected = encode(Array.from(new TextEncoder().encode(text)), {
      ecc: "M",
      border: 0
    });

    expect(size).toBe(expected.size);
    expect(modulesOf(path, size)).toEqual(expected.data);
  });
});
