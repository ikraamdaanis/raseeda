import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { useCanvasView } from "~/context/canvas-view-context";
import { settleGesture, useCanvasGestures } from "~/hooks/use-canvas-gestures";
import { cn } from "~/lib/utils";
import { usePaperSize, useTheme } from "~/stores/invoice-selectors";
import type { InvoicePaperSize } from "~/types";

// The page at the invoice's paper size: A4 is 210 x 297mm, Letter 8.5 x 11in.
const PAGE_SIZE_CLASSES: Record<InvoicePaperSize, string> = {
  A4: "min-h-[297mm] w-[210mm]",
  Letter: "min-h-[11in] w-[8.5in]"
};

const CANVAS_STATIC_STYLES: CSSProperties = {
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale"
};

// `onFieldTap` makes the page a way into the phone's form: tapping a field,
// or the text of a part, names it (by its `data-field` path and its part's
// `data-field-area`) for the form to open at. Taps between parts are left for
// the double-tap zoom.
export function InvoiceCanvas({
  onFieldTap,
  children
}: {
  onFieldTap?: (target: { field?: string; area?: string }) => void;
  children: ReactNode;
}) {
  const { view, setView, setZoom } = useCanvasView();
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

    function measurePage() {
      if (!page) return;

      setPageSize({ width: page.offsetWidth, height: page.offsetHeight });
    }

    function measureSection() {
      if (!section) return;

      const styles = getComputedStyle(section);
      const paddingX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY =
        parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

      setContainerSize({
        width: section.clientWidth - paddingX,
        height: section.clientHeight - paddingY
      });
    }

    // Measured before the first paint too, so a page mounted fitted (a
    // phone's Page tab) never shows a frame at full size first.
    measurePage();
    measureSection();

    const pageObserver = new ResizeObserver(measurePage);
    const sectionObserver = new ResizeObserver(measureSection);

    pageObserver.observe(page);
    sectionObserver.observe(section);

    return () => {
      pageObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  const zoom = resolveZoom(view, pageSize, containerSize);
  const fitZoom = resolveZoom("fit", pageSize, containerSize);
  // Where a finished zoom gesture left the page's top-left corner.
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

    // A zoom from the buttons, the menu or a shortcut keeps the middle of
    // what was in view in the middle. A fitted page that rescales because the
    // canvas changed size (the window, a status alert) keeps its top in place
    // instead, so a page fitted from the top doesn't open halfway down.
    if (!origin && previousZoom !== zoom) {
      if (view === previousView) {
        keepTopLeft(section, zoom / previousZoom);
      } else {
        keepCentre(section, zoom / previousZoom);
      }
    }
  });

  // A tap on the page is only a shortcut into the form, which the tab bar
  // reaches too, so it's listened for here rather than making the page a
  // control.
  useEffect(() => {
    const section = sectionRef.current;
    const page = pageRef.current;

    if (!onFieldTap || !section || !page) return;

    function handleClick(event: MouseEvent) {
      if (!page || !onFieldTap) return;

      const target = findTappedPart(page, event);

      if (target) onFieldTap(target);
    }

    section.addEventListener("click", handleClick);

    return () => section.removeEventListener("click", handleClick);
  }, [onFieldTap]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-0 flex-1 touch-pan-x touch-pan-y flex-col items-center-safe justify-center-safe overflow-auto overscroll-none p-3 md:p-8 md:pb-20"
    >
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

// The field under a tap, matched by where each field is drawn, since a
// read-only page lets taps pass through its fields; the smallest wins, as a
// field inside another's box is the one aimed at. With no field there, a tap
// on a part's own text (an amount, a printed row) names its part.
function findTappedPart(
  page: HTMLElement,
  { clientX, clientY, target }: MouseEvent
): { field?: string; area?: string } | null {
  const hits = Array.from(page.querySelectorAll<HTMLElement>("[data-field]"))
    .map(field => ({ field, rect: field.getBoundingClientRect() }))
    .filter(
      ({ rect }) =>
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
    )
    .sort(
      (a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height
    );
  const field = hits.at(0)?.field;

  if (field) {
    return {
      field: field.dataset.field,
      area: field.closest<HTMLElement>("[data-field-area]")?.dataset.fieldArea
    };
  }

  if (!(target instanceof HTMLElement)) return null;

  const area = target.closest<HTMLElement>("[data-field-area]");

  if (!area || area === target) return null;

  return { area: area.dataset.fieldArea };
}
