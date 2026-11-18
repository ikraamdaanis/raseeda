import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { NARROW_VIEWPORT_QUERY } from "~/context/editor-ui-context";
import {
  readStoredValue,
  writeStoredValue
} from "~/hooks/use-persistent-state";

type CanvasView = "fit" | number;

const VIEW_STORAGE_KEY = "editor-zoom";

// From this width the page at full size (about 880px with the desk's margins)
// fits between both side panels (256px and 288px), which a first visit opens.
const FULL_SIZE_FITS_QUERY = "(min-width: 1424px)";

// The least a double-tap on the fitted page zooms in to: full size.
export const DOUBLE_TAP_ZOOM = 1;

// How far a pinch can take the page, and the stops the zoom buttons and
// shortcuts step through.
export const MIN_ZOOM = 0.25;

export const MAX_ZOOM = 3;

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// The zoom stop beyond `zoom` in either direction, if there is one.
export function stepZoom(zoom: number, direction: "in" | "out") {
  return direction === "in"
    ? ZOOM_STEPS.find(step => step > zoom + 0.001)
    : ZOOM_STEPS.filter(step => step < zoom - 0.001).at(-1);
}

function parseView(stored: unknown): CanvasView | undefined {
  if (stored === "fit") return "fit";

  return typeof stored === "number" && stored >= MIN_ZOOM && stored <= MAX_ZOOM
    ? stored
    : undefined;
}

const CanvasViewContext = createContext<{
  view: CanvasView;
  setView: (view: CanvasView) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
} | null>(null);

export function CanvasViewProvider({ children }: { children: ReactNode }) {
  // The editor only renders on the client, so the viewport is known here.
  // Phones always open fitted, since the A4 page is wider than the screen and
  // only read there (they edit in a form). Wider screens reopen at the zoom
  // they were left at, first opening at full size where the page fits beside
  // both panels, and fitted where it would be cut off (most laptops).
  const [view, setViewState] = useState<CanvasView>(() => {
    if (window.matchMedia(NARROW_VIEWPORT_QUERY).matches) return "fit";

    return (
      readStoredValue(VIEW_STORAGE_KEY, parseView) ??
      (window.matchMedia(FULL_SIZE_FITS_QUERY).matches ? 1 : "fit")
    );
  });

  function setView(next: CanvasView) {
    setViewState(next);

    if (!window.matchMedia(NARROW_VIEWPORT_QUERY).matches) {
      writeStoredValue(VIEW_STORAGE_KEY, next);
    }
  }

  // The scale actually applied to the page; equals `view` unless fitting.
  const [zoom, setZoom] = useState(1);

  const value = {
    view,
    setView,
    zoom,
    setZoom
  };

  return (
    <CanvasViewContext.Provider value={value}>
      {children}
    </CanvasViewContext.Provider>
  );
}

export function useCanvasView() {
  const context = useContext(CanvasViewContext);

  if (!context) {
    throw new Error("useCanvasView must be used within a CanvasViewProvider");
  }

  return context;
}
