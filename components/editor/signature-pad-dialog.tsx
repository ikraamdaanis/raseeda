import type { PointerEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import type { SignatureStrokePoint } from "~/types";
import { drawStrokes, renderSignaturePng } from "~/utils/signature-strokes";
import { storeImageBlob } from "~/utils/store-uploaded-image";

// Draws a signature with a mouse, finger or stylus. Done stores it as a PNG
// image, like an uploaded one, and hands back its id; the strokes themselves
// aren't kept.
export function SignaturePadDialog({
  open,
  onOpenChange,
  onDone
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (imageId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draw your signature</DialogTitle>
          <DialogDescription>
            Sign with a mouse, finger or stylus. To change it later, remove it
            and draw it again.
          </DialogDescription>
        </DialogHeader>
        <SignaturePad
          onCancel={() => onOpenChange(false)}
          onDone={imageId => {
            onDone(imageId);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function redraw(
  canvas: HTMLCanvasElement | null,
  strokes: SignatureStrokePoint[][]
) {
  const context = canvas?.getContext("2d");

  if (!canvas || !context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawStrokes(context, strokes, { width: canvas.width, height: canvas.height });
}

function readPoint(
  event: PointerEvent<HTMLCanvasElement>
): SignatureStrokePoint {
  const bounds = event.currentTarget.getBoundingClientRect();

  return {
    x: Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1),
    y: Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1)
  };
}

// The pad and its buttons. It unmounts with the dialog's content, so every
// open starts blank.
function SignaturePad({
  onCancel,
  onDone
}: {
  onCancel: () => void;
  onDone: (imageId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<SignatureStrokePoint[][]>([]);
  const isDrawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // The canvas draws at the screen's pixels, so ink stays crisp at any size.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      redraw(canvas, strokesRef.current);
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    strokesRef.current = [...strokesRef.current, [readPoint(event)]];
    redraw(canvasRef.current, strokesRef.current);
    setHasInk(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = strokesRef.current.at(-1);

    if (!isDrawingRef.current || !stroke) return;

    stroke.push(readPoint(event));
    redraw(canvasRef.current, strokesRef.current);
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function handleClear() {
    strokesRef.current = [];
    redraw(canvasRef.current, strokesRef.current);
    setHasInk(false);
  }

  // Stays saving once stored: the dialog closes, and the button never shows
  // pressable again on the way out.
  async function handleDone() {
    setIsSaving(true);

    const png = await renderSignaturePng(strokesRef.current);

    if (!png) {
      toast.error("Couldn't make the signature. Please try again.");
      setIsSaving(false);

      return;
    }

    const imageId = await storeImageBlob(png, "image/png");

    if (!imageId) {
      setIsSaving(false);

      return;
    }

    onDone(imageId);
  }

  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-2">
        <canvas
          ref={canvasRef}
          data-paper
          aria-label="Signature pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="bg-paper border-paper-border aspect-5/2 w-full cursor-crosshair touch-none rounded-md border"
        />
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={!hasInk || isSaving}
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
      <DialogFooter>
        <Button variant="secondary" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!hasInk || isSaving} onClick={handleDone}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
