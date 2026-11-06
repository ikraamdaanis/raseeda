import type { CSSProperties, FocusEvent, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { FIELD_ZOOM, useCanvasView } from "~/context/canvas-view-context";
import { useEditorUi } from "~/context/editor-ui-context";
import { settleGesture, useCanvasGestures } from "~/hooks/use-canvas-gestures";
import { cn } from "~/lib/utils";
import { usePaperSize, useTheme } from "~/stores/invoice-selectors";
import type { InvoicePaperSize } from "~/types";

// The page at the invoice's paper size: A4 is 210 x 297mm, Letter 8.5 x 11in.
const PAGE_SIZE_CLASSES: Record<InvoicePaperSize, string> = {
  A4: "min-h-[297mm] w-[210mm]",
  Letter: "min-h-[11in] w-[8.5in]"
};

// @page can't read the invoice, and a named page set on the paper alone would
// leave the editor's chrome before it on an A4 sheet, so a Letter invoice sets
// the size for the whole print while it's open.
const LETTER_PAGE_STYLE = "@page { size: letter; }";

const CANVAS_STATIC_STYLES: CSSProperties = {
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale"
};

export function InvoiceCanvas({ children }: { children: ReactNode }) {
  const { view, setView, setZoom, zoomToField } = useCanvasView();
  const { mode, isNarrow } = useEditorUi();
  const theme = useTheme();
  const paperSize = usePaperSize();
  const baseFont = getInvoiceFontDefinition(theme.font);
  const sectionRef = useRef<HTMLElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const page = pageRef.current;
    const section = sectionRef.current;

    if (!page || !section) return;

    const pageObserver = new ResizeObserver(() => {
      setPageSize({ width: page.offsetWidth, height: page.offsetHeight });
    });
    const sectionObserver = new ResizeObserver(() => {
      const styles = getComputedStyle(section);
      const paddingX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY =
        parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

      setContainerSize({
        width: section.clientWidth - paddingX,
        height: section.clientHeight - paddingY
      });
    });

    pageObserver.observe(page);
    sectionObserver.observe(section);

    return () => {
      pageObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  const zoom = resolveZoom(view, pageSize, containerSize);
  const fitZoom = resolveZoom("fit", pageSize, containerSize);
  // The field a phone zoomed in on, brought into view once the zoom applies,
  // and where a finished zoom gesture left the page's top-left corner.
  const fieldToRevealRef = useRef<HTMLElement | null>(null);
  const gestureOriginRef = useRef<{ x: number; y: number } | null>(null);
  const previousZoomRef = useRef(zoom);
  const previousViewRef = useRef(view);
  // Filled in by the layout effect below before any gesture can start.
  const gestureStateRef = useRef({
    zoom,
    fitZoom,
    isFit: view === "fit",
    commit: (_view: "fit" | number, _origin: { x: number; y: number }) => {}
  });

  // A pinch, trackpad pinch or double-tap ends here: the page takes its new
  // zoom in one render, and the layout effect below scrolls it to where the
  // gesture left it.
  function commitGesture(
    nextView: "fit" | number,
    origin: { x: number; y: number }
  ) {
    const section = sectionRef.current;
    const sizer = sizerRef.current;

    if (
      Math.abs(resolveZoom(nextView, pageSize, containerSize) - zoom) < 0.0005
    ) {
      if (section && sizer) settleGesture(section, sizer, origin);

      return;
    }

    gestureOriginRef.current = origin;
    // Rendered at once, so a gesture that starts straight after this one
    // measures the page at its committed zoom, not under the old transform.
    flushSync(() => setView(nextView));
  }

  useCanvasGestures({ sectionRef, sizerRef, stateRef: gestureStateRef });

  useLayoutEffect(() => {
    setZoom(zoom);
    gestureStateRef.current = {
      zoom,
      fitZoom,
      isFit: view === "fit",
      commit: commitGesture
    };

    const section = sectionRef.current;
    const sizer = sizerRef.current;
    const field = fieldToRevealRef.current;
    const origin = gestureOriginRef.current;

    const previousZoom = previousZoomRef.current;
    const previousView = previousViewRef.current;
    previousZoomRef.current = zoom;
    previousViewRef.current = view;

    if (!section || !sizer) return;

    if (origin) {
      gestureOriginRef.current = null;
      settleGesture(section, sizer, origin);
    }

    if (field) {
      fieldToRevealRef.current = null;
      revealField(section, field);
    }

    // A zoom from the buttons, the menu or a shortcut keeps the middle of
    // what was in view in the middle. A fitted page that rescales because the
    // canvas changed size (the window, a status alert) keeps its top in place
    // instead, so a page fitted from the top doesn't open halfway down.
    if (!origin && !field && previousZoom !== zoom) {
      if (view === previousView) {
        keepTopLeft(section, zoom / previousZoom);
      } else {
        keepCentre(section, zoom / previousZoom);
      }
    }
  });

  // On a phone the fitted page is too small to type into, so tapping a field
  // zooms in to full size around it; Done in the phone tab bar fits it again.
  function handleFocus(event: FocusEvent<HTMLElement>) {
    const field = event.target;
    const isTextField =
      field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;

    if (!isNarrow || mode !== "edit" || !isTextField) return;
    if (zoom >= FIELD_ZOOM || !pageRef.current?.contains(field)) return;

    fieldToRevealRef.current = field;
    zoomToField();
  }

  return (
    <section
      ref={sectionRef}
      onFocus={handleFocus}
      className="relative flex min-h-0 flex-1 touch-pan-x touch-pan-y flex-col items-center-safe justify-center-safe overflow-auto overscroll-none p-3 md:p-8 md:pb-20"
    >
      {paperSize === "Letter" && <style>{LETTER_PAGE_STYLE}</style>}
      <div
        ref={sizerRef}
        className="shrink-0 origin-top-left"
        style={
          pageSize.width
            ? { width: pageSize.width * zoom, height: pageSize.height * zoom }
            : undefined
        }
      >
        <div
          ref={pageRef}
          data-paper
          className={cn(
            "border-paper-border bg-paper text-paper-foreground border p-[40pt] shadow-md",
            PAGE_SIZE_CLASSES[paperSize]
          )}
          style={{
            ...CANVAS_STATIC_STYLES,
            fontFamily: baseFont.cssFamily,
            letterSpacing: baseFont.letterSpacing,
            transform: `scale(${zoom})`,
            transformOrigin: "top left"
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function resolveZoom(
  view: "fit" | number,
  pageSize: { width: number; height: number },
  containerSize: { width: number; height: number }
) {
  if (typeof view === "number") return view;

  if (!pageSize.width || !pageSize.height || !containerSize.width) return 1;

  const widthFit = containerSize.width / pageSize.width;

  // On a short canvas (a phone on its side) the whole page would be too small
  // to read, so the page fits the width and scrolls instead.
  if (containerSize.height < SHORT_CANVAS_HEIGHT) return Math.min(widthFit, 1);

  return Math.min(widthFit, containerSize.height / pageSize.height);
}

const SHORT_CANVAS_HEIGHT = 360;

function keepCentre(section: HTMLElement, ratio: number) {
  const centreX = section.scrollLeft + section.clientWidth / 2;
  const centreY = section.scrollTop + section.clientHeight / 2;

  section.scrollLeft = centreX * ratio - section.clientWidth / 2;
  section.scrollTop = centreY * ratio - section.clientHeight / 2;
}

function keepTopLeft(section: HTMLElement, ratio: number) {
  section.scrollLeft *= ratio;
  section.scrollTop *= ratio;
}

// Brings a field into view high on the canvas, clear of the keyboard that is
// about to cover the lower half of the screen. A field that fits ends at the
// right edge, so its label (to its left on the page) stays in view; a wider
// one starts at the left edge.
function revealField(section: HTMLElement, field: HTMLElement) {
  const sectionRect = section.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();
  const margin = 16;
  const left =
    fieldRect.width > sectionRect.width - margin * 2
      ? fieldRect.left - sectionRect.left - margin
      : fieldRect.right - sectionRect.right + margin;

  section.scrollTo({
    left: section.scrollLeft + left,
    top:
      section.scrollTop +
      fieldRect.top -
      sectionRect.top -
      sectionRect.height * 0.15
  });
}
