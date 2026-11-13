import {
  DRAWN_SIGNATURE_SCALE,
  SIGNATURE_HEIGHT_MM,
  SIGNATURE_WIDTH_MM
} from "~/consts/signature";
import type { SignatureStrokePoint } from "~/types";

// The ink's width as a fraction of the drawing's width: about 0.4mm in print.
const INK_WIDTH = 0.008;
export const SIGNATURE_INK = "#1a1a1a";

const CSS_PIXELS_PER_MM = 96 / 25.4;

// The stored PNG's size: three times the signature box's CSS pixels.
export const DRAWN_SIGNATURE_SIZE = {
  width: Math.round(
    SIGNATURE_WIDTH_MM * CSS_PIXELS_PER_MM * DRAWN_SIGNATURE_SCALE
  ),
  height: Math.round(
    SIGNATURE_HEIGHT_MM * CSS_PIXELS_PER_MM * DRAWN_SIGNATURE_SCALE
  )
};

/**
 * Draws the strokes onto a canvas `width` x `height` pixels, in round ink
 * smoothed through each segment's midpoint. A stroke of one point (a tap) is a
 * dot.
 */
export function drawStrokes(
  context: Pick<
    CanvasRenderingContext2D,
    | "beginPath"
    | "moveTo"
    | "lineTo"
    | "quadraticCurveTo"
    | "arc"
    | "fill"
    | "stroke"
    | "lineWidth"
    | "lineCap"
    | "lineJoin"
    | "strokeStyle"
    | "fillStyle"
  >,
  strokes: SignatureStrokePoint[][],
  { width, height }: { width: number; height: number }
) {
  const lineWidth = width * INK_WIDTH;

  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = SIGNATURE_INK;
  context.fillStyle = SIGNATURE_INK;

  for (const stroke of strokes) {
    const points = stroke.map(point => ({
      x: point.x * width,
      y: point.y * height
    }));
    const first = points.at(0);

    if (!first) continue;

    context.beginPath();

    if (points.length === 1) {
      context.arc(first.x, first.y, lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }

    context.moveTo(first.x, first.y);

    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const next = points[i + 1];

      context.quadraticCurveTo(
        point.x,
        point.y,
        (point.x + next.x) / 2,
        (point.y + next.y) / 2
      );
    }

    const last = points[points.length - 1];

    context.lineTo(last.x, last.y);
    context.stroke();
  }
}

/**
 * Renders the strokes to a transparent PNG at DRAWN_SIGNATURE_SIZE, stored
 * like an uploaded signature. Resolves null if the browser couldn't make it.
 */
export function renderSignaturePng(
  strokes: SignatureStrokePoint[][]
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = DRAWN_SIGNATURE_SIZE.width;
  canvas.height = DRAWN_SIGNATURE_SIZE.height;

  if (!context) return Promise.resolve(null);

  drawStrokes(context, strokes, DRAWN_SIGNATURE_SIZE);

  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}
