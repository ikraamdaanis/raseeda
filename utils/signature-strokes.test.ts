import { describe, expect, it } from "vitest";
import { DRAWN_SIGNATURE_SIZE, drawStrokes } from "~/utils/signature-strokes";

function recordingContext() {
  const calls: string[] = [];
  const context = {
    lineWidth: 0,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    strokeStyle: "" as string | CanvasGradient | CanvasPattern,
    fillStyle: "" as string | CanvasGradient | CanvasPattern,
    beginPath: () => calls.push("beginPath"),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x} ${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x} ${y}`),
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) =>
      calls.push(`curve ${cpx} ${cpy} ${x} ${y}`),
    arc: (x: number, y: number) => calls.push(`arc ${x} ${y}`),
    fill: () => calls.push("fill"),
    stroke: () => calls.push("stroke")
  };

  return { context, calls };
}

describe("drawn signatures", () => {
  it("are stored at about 300 dpi across the 5cm box", () => {
    expect(DRAWN_SIGNATURE_SIZE).toEqual({ width: 567, height: 227 });
  });

  it("draw each stroke at the canvas's size, and a tap as a dot", () => {
    const { context, calls } = recordingContext();

    drawStrokes(
      context,
      [
        [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { x: 1, y: 0 }
        ],
        [{ x: 0.25, y: 1 }]
      ],
      { width: 200, height: 100 }
    );

    expect(calls).toEqual([
      "beginPath",
      "moveTo 0 0",
      "curve 100 50 150 25",
      "lineTo 200 0",
      "stroke",
      "beginPath",
      "arc 50 100",
      "fill"
    ]);
    expect(context.lineWidth).toBeCloseTo(1.6);
    expect(context.lineCap).toBe("round");
  });
});
