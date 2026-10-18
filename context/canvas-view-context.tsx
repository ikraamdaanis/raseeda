import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import {
  COMPACT_VIEWPORT_QUERY,
  NARROW_VIEWPORT_QUERY
} from "~/context/editor-ui-context";
import {
  readStoredValue,
  writeStoredValue
} from "~/hooks/use-persistent-state";

type CanvasView = "fit" | number;

const VIEW_STORAGE_KEY = "editor-zoom";

// The zoom a phone jumps to when a field on the fitted page is tapped, so the
// text being typed is full size.
export const FIELD_ZOOM = 1;

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
  isZoomedToField: boolean;
  zoomToField: () => void;
} | null>(null);

export function CanvasViewProvider({ children }: { children: ReactNode }) {
  // The editor only renders on the client, so the viewport is known here.
  // Phones always open fitted, since the A4 page is wider than the screen and
  // the user zooms in to edit. Wider screens reopen at the zoom they were left
  // at, first opening at full size, or fitted where the page won't fit beside
  // a panel.
  const [view, setViewState] = useState<CanvasView>(() => {
    if (window.matchMedia(NARROW_VIEWPORT_QUERY).matches) return "fit";

    return (
      readStoredValue(VIEW_STORAGE_KEY, parseView) ??
      (window.matchMedia(COMPACT_VIEWPORT_QUERY).matches ? "fit" : 1)
    );
  });

  // Set while a phone is zoomed in on a field it was fitted out from; Done, or
  // any other zoom change, ends it.
  const [isZoomedToField, setIsZoomedToField] = useState(false);

  function setView(next: CanvasView) {
    setViewState(next);
    setIsZoomedToField(false);

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
    setZoom,
    isZoomedToField,
    zoomToField: () => {
      setViewState(FIELD_ZOOM);
      setIsZoomedToField(true);
    }
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
