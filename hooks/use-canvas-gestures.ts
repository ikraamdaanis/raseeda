import type { RefObject } from "react";
import { useEffect } from "react";
import { FIELD_ZOOM, MAX_ZOOM, MIN_ZOOM } from "~/context/canvas-view-context";

type Point = { x: number; y: number };

// What the canvas tells the gestures each render: the applied zoom, the zoom
// that fits the page, and how to hand over a finished gesture.
type CanvasGestureState = {
  zoom: number;
  fitZoom: number;
  isFit: boolean;
  commit: (view: "fit" | number, origin: Point) => void;
};

// A zoom in progress. React doesn't re-render the page while it runs: the
// wrapper around it is moved and scaled with a plain 2D transform, and the
// real zoom is committed once, when the gesture ends.
type LiveZoom = {
  startZoom: number;
  scale: number;
  focus: Point;
  anchor: Point;
  base: Point;
  scroll: Point;
  size: { width: number; height: number };
  bounds: { left: number; top: number; right: number; bottom: number };
  frame: number | null;
  // The desk's overflow before scrolling was locked for a touch pinch.
  overflow: string | null;
};

const DOUBLE_TAP_MS = 350;

const DOUBLE_TAP_ANIMATION_MS = 240;

// The editor owns zoom gestures, as in Figma and tldraw: the browser's own
// pinch would scale the whole editor, top bar and all, so it is cancelled
// (Safari's gesture events here, `touch-action` in globals.css). Pinching the
// desk, a trackpad pinch (a wheel event with Ctrl held) and double-tapping
// bare paper zoom the page instead.
//
// Each frame only changes a 2D transform, and the page is never given its own
// compositing layer (no `will-change`, no 3D transform). A layer is drawn
// once at the scale it starts at and then stretched, which is what made the
// page blurry until the fingers lifted: Chrome doesn't redraw a
// `will-change: transform` layer as its scale changes, and WebKit doesn't
// redraw a composited layer scaled up at all. Left in its scroller's layer,
// the page is redrawn sharp at every step, and the invoice is light enough
// to redraw each frame.
//
// A touch pinch also locks the desk's scrolling: a finger that was already
// scrolling makes iOS keep scrolling natively under the pinch (its touch
// moves can no longer be cancelled), which fought the transform and made the
// page wobble.
export function useCanvasGestures({
  sectionRef,
  sizerRef,
  stateRef
}: {
  sectionRef: RefObject<HTMLElement | null>;
  sizerRef: RefObject<HTMLDivElement | null>;
  stateRef: RefObject<CanvasGestureState>;
}) {
  useEffect(() => {
    const section = sectionRef.current;
    const sizer = sizerRef.current;

    if (!section || !sizer) return;

    let live: LiveZoom | null = null;
    let pinchDistance = 0;
    let pinchTouches: [number, number] | null = null;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let animation: number | null = null;
    let tapStart: { time: number; point: Point } | null = null;
    let lastTap: { time: number; point: Point } | null = null;

    function begin(focus: Point): LiveZoom | null {
      if (!section || !sizer) return null;

      const sizerRect = sizer.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const styles = getComputedStyle(section);
      const zoom = stateRef.current.zoom;

      return {
        startZoom: zoom,
        scale: 1,
        focus,
        anchor: { x: focus.x - sizerRect.left, y: focus.y - sizerRect.top },
        base: { x: sizerRect.left, y: sizerRect.top },
        scroll: { x: section.scrollLeft, y: section.scrollTop },
        size: { width: sizerRect.width, height: sizerRect.height },
        bounds: {
          left: sectionRect.left + parseFloat(styles.paddingLeft),
          top: sectionRect.top + parseFloat(styles.paddingTop),
          right:
            sectionRect.left +
            section.clientWidth -
            parseFloat(styles.paddingRight),
          bottom:
            sectionRect.top +
            section.clientHeight -
            parseFloat(styles.paddingBottom)
        },
        frame: null,
        overflow: null
      };
    }

    // Stops the desk scrolling for the rest of a touch pinch, where it is,
    // momentum included.
    function lockScrolling(zoom: LiveZoom) {
      if (!section) return;

      const { scrollLeft, scrollTop } = section;

      zoom.overflow = section.style.overflow;
      section.style.overflow = "hidden";
      section.scrollLeft = scrollLeft;
      section.scrollTop = scrollTop;
    }

    function update(zoom: LiveZoom, scale: number, focus: Point) {
      zoom.scale = Math.min(
        MAX_ZOOM / zoom.startZoom,
        Math.max(MIN_ZOOM / zoom.startZoom, scale)
      );
      zoom.focus = focus;
      zoom.frame ??= requestAnimationFrame(() => paint(zoom));
    }

    function paint(zoom: LiveZoom) {
      zoom.frame = null;

      if (!section || !sizer) return;

      const origin = originFor(zoom);
      // Where the untransformed wrapper sits now. A touch pinch locks
      // scrolling, but a trackpad's momentum from an earlier swipe can still
      // scroll the desk under a trackpad pinch.
      const baseX = zoom.base.x - (section.scrollLeft - zoom.scroll.x);
      const baseY = zoom.base.y - (section.scrollTop - zoom.scroll.y);

      sizer.style.transform = `translate(${origin.x - baseX}px, ${origin.y - baseY}px) scale(${zoom.scale})`;
    }

    function end(view?: "fit") {
      if (!live) return;

      const zoom = live;
      live = null;

      if (zoom.frame !== null) cancelAnimationFrame(zoom.frame);
      if (section && zoom.overflow !== null) {
        section.style.overflow = zoom.overflow;
      }

      stateRef.current.commit(
        view ?? zoom.startZoom * zoom.scale,
        originFor(zoom)
      );
    }

    // Animates a double-tap zoom to `targetZoom` around `focus`, through the
    // same transform as a pinch.
    function animateTo(targetZoom: number, focus: Point, view?: "fit") {
      const started = begin(focus);

      if (!started) return;

      const zoom: LiveZoom = started;
      live = zoom;
      const targetScale = targetZoom / zoom.startZoom;

      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        zoom.scale = targetScale;
        end(view);

        return;
      }

      const startTime = performance.now();

      function step(now: number) {
        const progress = Math.min(
          1,
          (now - startTime) / DOUBLE_TAP_ANIMATION_MS
        );
        const eased = 1 - (1 - progress) ** 3;

        zoom.scale = targetScale ** eased;
        paint(zoom);

        if (progress < 1) {
          animation = requestAnimationFrame(step);

          return;
        }

        animation = null;
        end(view);
      }

      animation = requestAnimationFrame(step);
    }

    function preventBrowserZoom(event: Event) {
      event.preventDefault();
    }

    function handleTouchStart(event: TouchEvent) {
      if (animation !== null) return;

      if (event.touches.length === 2) {
        const [first, second] = [event.touches[0], event.touches[1]];
        tapStart = null;
        clearTimeout(wheelTimer);
        end();
        pinchTouches = [first.identifier, second.identifier];
        pinchDistance = touchDistance(first, second);
        live = begin(touchMidpoint(first, second));

        if (live) lockScrolling(live);

        return;
      }

      const touch = event.touches[0];

      tapStart =
        event.touches.length === 1
          ? {
              time: event.timeStamp,
              point: { x: touch.clientX, y: touch.clientY }
            }
          : null;
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length >= 2 && live && animation === null) {
        event.preventDefault();
        // The pinch follows the two fingers it started with, so a third
        // finger landing, or one of the pair lifting, can't make it jump.
        const first = findTouch(event.touches, pinchTouches?.[0]);
        const second = findTouch(event.touches, pinchTouches?.[1]);

        if (!first || !second) return;

        update(
          live,
          touchDistance(first, second) / pinchDistance,
          touchMidpoint(first, second)
        );

        return;
      }

      const touch = event.touches[0];

      if (
        tapStart &&
        Math.hypot(
          touch.clientX - tapStart.point.x,
          touch.clientY - tapStart.point.y
        ) > 10
      ) {
        tapStart = null;
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      if (live && !pinchStillDown(event.touches) && animation === null) end();
      if (!tapStart || event.touches.length > 0) return;

      const tap = tapStart;
      tapStart = null;

      if (event.timeStamp - tap.time > 300 || isInteractive(event.target)) {
        lastTap = null;

        return;
      }

      const isDoubleTap =
        lastTap !== null &&
        tap.time - lastTap.time < DOUBLE_TAP_MS &&
        Math.hypot(
          tap.point.x - lastTap.point.x,
          tap.point.y - lastTap.point.y
        ) < 30;

      lastTap = isDoubleTap ? null : tap;

      if (!isDoubleTap || animation !== null) return;

      event.preventDefault();
      const { zoom, fitZoom, isFit } = stateRef.current;

      // From the fitted page a double-tap zooms in, to full size or, where
      // the fitted page is already that big, to twice the fit; from any other
      // zoom it fits the page again.
      if (isFit || Math.abs(zoom - fitZoom) < 0.01) {
        animateTo(Math.max(FIELD_ZOOM, fitZoom * 2), tap.point);
      } else {
        animateTo(fitZoom, tap.point, "fit");
      }
    }

    // A cancelled touch (the system taking over for a notification or an
    // edge swipe) is never a tap.
    function handleTouchCancel() {
      tapStart = null;
      lastTap = null;

      if (live && animation === null) end();
    }

    function pinchStillDown(touches: TouchList) {
      return (
        findTouch(touches, pinchTouches?.[0]) !== undefined &&
        findTouch(touches, pinchTouches?.[1]) !== undefined
      );
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      if (animation !== null) return;

      const focus = { x: event.clientX, y: event.clientY };

      live ??= begin(focus);

      if (!live) return;

      // A trackpad pinch sends many small deltas; a mouse wheel notch with
      // Ctrl held sends one large one (about 100px in Chrome on Windows),
      // which is capped so a notch is a step rather than a leap.
      const pixels =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaY;
      const delta = Math.max(-10, Math.min(10, pixels));

      update(live, live.scale * Math.exp(-delta * 0.01), focus);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => end(), 150);
    }

    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      document.addEventListener(type, preventBrowserZoom);
    }

    // Only a two-finger move is cancelled, so one-finger scrolling stays
    // native.
    section.addEventListener("touchstart", handleTouchStart, { passive: true });
    section.addEventListener("touchmove", handleTouchMove, { passive: false });
    section.addEventListener("touchend", handleTouchEnd, { passive: false });
    section.addEventListener("touchcancel", handleTouchCancel);
    section.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        document.removeEventListener(type, preventBrowserZoom);
      }

      clearTimeout(wheelTimer);

      if (animation !== null) cancelAnimationFrame(animation);
      if (live?.frame) cancelAnimationFrame(live.frame);
      if (live && live.overflow !== null)
        section.style.overflow = live.overflow;
      section.removeEventListener("touchstart", handleTouchStart);
      section.removeEventListener("touchmove", handleTouchMove);
      section.removeEventListener("touchend", handleTouchEnd);
      section.removeEventListener("touchcancel", handleTouchCancel);
      section.removeEventListener("wheel", handleWheel);
    };
  }, [sectionRef, sizerRef, stateRef]);
}

// Clears a finished gesture's transform and scrolls so the page sits exactly
// where the gesture left it, now at its committed zoom.
export function settleGesture(
  section: HTMLElement,
  sizer: HTMLElement,
  origin: Point
) {
  sizer.style.transform = "";
  const sizerRect = sizer.getBoundingClientRect();

  section.scrollLeft += sizerRect.left - origin.x;
  section.scrollTop += sizerRect.top - origin.y;
}

// Where the page's top-left corner lands on screen for a gesture. It follows
// the fingers, but only as far as the desk can scroll, and an axis where the
// page is smaller than the desk is centred, as the desk lays it out; so the
// committed zoom lands the page exactly where the gesture showed it.
function originFor(zoom: LiveZoom): Point {
  const width = zoom.size.width * zoom.scale;
  const height = zoom.size.height * zoom.scale;

  return {
    x: axisOrigin(
      zoom.focus.x - zoom.anchor.x * zoom.scale,
      width,
      zoom.bounds.left,
      zoom.bounds.right
    ),
    y: axisOrigin(
      zoom.focus.y - zoom.anchor.y * zoom.scale,
      height,
      zoom.bounds.top,
      zoom.bounds.bottom
    )
  };
}

function axisOrigin(wanted: number, size: number, start: number, end: number) {
  const room = end - start;

  if (size <= room) return start + (room - size) / 2;

  return Math.min(start, Math.max(end - size, wanted));
}

function findTouch(touches: TouchList, identifier: number | undefined) {
  return Array.from(touches).find(touch => touch.identifier === identifier);
}

function touchDistance(first: Touch, second: Touch) {
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
}

function touchMidpoint(first: Touch, second: Touch) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2
  };
}

// Taps on fields and buttons keep their own meaning; only taps on the page's
// bare paper, the desk, or a read-only field in Preview count towards a
// double-tap zoom.
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      "input:not([readonly]), textarea:not([readonly]), button, a, label, [role=button], [role=option]"
    ) !== null
  );
}
