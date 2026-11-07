import { describe, expect, it } from "vitest";
import { getContrastWithWhite } from "~/utils/contrast";

describe("getContrastWithWhite", () => {
  it("runs from 1 for white to 21 for black", () => {
    expect(getContrastWithWhite("#ffffff")).toBeCloseTo(1);
    expect(getContrastWithWhite("#000000")).toBeCloseTo(21);
  });

  it("matches the WCAG ratios of common greys", () => {
    expect(getContrastWithWhite("#767676")).toBeCloseTo(4.54, 1);
    expect(getContrastWithWhite("#1a1a1a")).toBeGreaterThan(17);
  });

  it("reads short hex codes", () => {
    expect(getContrastWithWhite("#fff")).toBeCloseTo(1);
  });
});
