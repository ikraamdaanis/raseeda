import { describe, expect, it } from "vitest";
import { getFieldZoom, MAX_ZOOM } from "~/context/canvas-view-context";

describe("getFieldZoom", () => {
  it("zooms small text up to at least 16px", () => {
    expect(getFieldZoom(13) * 13).toBeGreaterThanOrEqual(16);
    expect(getFieldZoom(14) * 14).toBeGreaterThanOrEqual(16);
  });

  it("never zooms in less than full size", () => {
    expect(getFieldZoom(28)).toBe(1);
    expect(getFieldZoom(0)).toBe(1);
    expect(getFieldZoom(Number.NaN)).toBe(1);
  });

  it("stops at the furthest zoom", () => {
    expect(getFieldZoom(2)).toBe(MAX_ZOOM);
  });
});
