import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import {
  readStoredValue,
  writeStoredValue
} from "~/hooks/use-persistent-state";
import type { LibraryTab } from "~/types";

type EditorMode = "edit" | "preview";

type PanelState = { left: boolean; right: boolean };

const PANELS_STORAGE_KEY = "editor-panels";

const MODE_STORAGE_KEY = "editor-mode";

const LIBRARY_TAB_STORAGE_KEY = "editor-library-tab";

const ALL_CLOSED: PanelState = { left: false, right: false };

// Below this width the side panels open over the canvas instead of beside it,
// so they start closed there.
export const NARROW_VIEWPORT_QUERY = "(max-width: 767px)";

// Below this width the canvas can't fit the page and its toolbar between both
// panels, so opening one side panel closes the other.
export const COMPACT_VIEWPORT_QUERY = "(max-width: 1023px)";

function isNarrowViewport() {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

function parsePanels(stored: unknown): PanelState | undefined {
  if (
    typeof stored !== "object" ||
    stored === null ||
    !("left" in stored) ||
    !("right" in stored)
  ) {
    return undefined;
  }

  return { left: stored.left === true, right: stored.right === true };
}

function parseLibraryTab(stored: unknown): LibraryTab | undefined {
  return stored === "invoices" || stored === "templates" ? stored : undefined;
}

function parseMode(stored: unknown): EditorMode | undefined {
  return stored === "edit" || stored === "preview" ? stored : undefined;
}

// The layout the editor reopens with: the panels and mode as they were left.
// Preview reopens in Preview, with the panels it hid ready to come back. Phones
// always start with the panels closed, since each covers the page.
function readInitialLayout(): {
  mode: EditorMode;
  panels: PanelState;
  panelsBeforePreview: PanelState | null;
} {
  const storedPanels = isNarrowViewport()
    ? ALL_CLOSED
    : (readStoredValue(PANELS_STORAGE_KEY, parsePanels) ?? {
        left: true,
        right: true
      });
  const mode = readStoredValue(MODE_STORAGE_KEY, parseMode) ?? "edit";

  return mode === "preview"
    ? { mode, panels: ALL_CLOSED, panelsBeforePreview: storedPanels }
    : { mode, panels: storedPanels, panelsBeforePreview: null };
}

function storePanels(panels: PanelState) {
  if (!isNarrowViewport()) writeStoredValue(PANELS_STORAGE_KEY, panels);
}

// The editor shell's own state: whether the page is being edited or previewed,
// which side panels are open and which tab the invoices panel shows.
// Previewing hides both panels and leaving it puts back whichever were open.
// All three are remembered across reloads. Phones have no Preview: the PDF
// that Download opens shows the page as it prints, so there the page is always
// being edited, and a wider window's Preview comes back when there is room
// again.
const EditorUiContext = createContext<{
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  toggleMode: () => void;
  isNarrow: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setPanelOpen: (side: keyof PanelState, open: boolean) => void;
  togglePanel: (side: keyof PanelState) => void;
  toggleAllPanels: () => void;
  closePanels: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  libraryTab: LibraryTab;
  setLibraryTab: (tab: LibraryTab) => void;
  // Opens the invoices panel on a tab with focus in its search (⌘O, Open
  // Invoice, Open Template); the panel focuses its search each time this
  // count goes up.
  showLibrary: (tab: LibraryTab) => void;
  librarySearchRequest: number;
} | null>(null);

export function EditorUiProvider({ children }: { children: ReactNode }) {
  const [initialLayout] = useState(readInitialLayout);
  const [chosenMode, setChosenMode] = useState<EditorMode>(initialLayout.mode);
  const [panels, setPanels] = useState<PanelState>(initialLayout.panels);
  const [panelsBeforePreview, setPanelsBeforePreview] =
    useState<PanelState | null>(initialLayout.panelsBeforePreview);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>(
    () =>
      readStoredValue(LIBRARY_TAB_STORAGE_KEY, parseLibraryTab) ?? "invoices"
  );
  const [librarySearchRequest, setLibrarySearchRequest] = useState(0);
  const isNarrow = useMediaQuery(NARROW_VIEWPORT_QUERY);
  const isCompact = useMediaQuery(COMPACT_VIEWPORT_QUERY);
  // Both panels can be remembered open from a wider window; a compact one
  // shows only the inspector, and both come back when there is room again.
  const leftPanelOpen = panels.left && !(isCompact && panels.right);
  const rightPanelOpen = panels.right;
  const mode = isNarrow ? "edit" : chosenMode;

  function setModeState(next: EditorMode) {
    setChosenMode(next);
    writeStoredValue(MODE_STORAGE_KEY, next);
  }

  function applyPanels(next: PanelState) {
    setPanels(next);
    storePanels(next);
  }

  function setMode(next: EditorMode) {
    if (isNarrow || next === chosenMode) return;

    if (next === "preview") {
      setPanelsBeforePreview(panels);
      setPanels({ left: false, right: false });
    } else {
      setPanels(panelsBeforePreview ?? panels);
      setPanelsBeforePreview(null);
    }

    setModeState(next);
  }

  // Opening a panel while previewing goes back to editing first; on a phone
  // or a compact window only one panel is open at a time.
  function setPanelOpen(side: keyof PanelState, open: boolean) {
    const base =
      chosenMode === "preview"
        ? (panelsBeforePreview ?? panels)
        : { left: leftPanelOpen, right: rightPanelOpen };
    const next = { ...base, [side]: open };

    if (isCompact && open) next[side === "left" ? "right" : "left"] = false;

    if (chosenMode === "preview") {
      setModeState("edit");
      setPanelsBeforePreview(null);
    }

    applyPanels(next);
  }

  function changeLibraryTab(tab: LibraryTab) {
    setLibraryTab(tab);
    writeStoredValue(LIBRARY_TAB_STORAGE_KEY, tab);
  }

  const value = {
    mode,
    setMode,
    toggleMode: () => setMode(chosenMode === "edit" ? "preview" : "edit"),
    isNarrow,
    leftPanelOpen,
    rightPanelOpen,
    setPanelOpen,
    togglePanel: (side: keyof PanelState) =>
      setPanelOpen(side, side === "left" ? !leftPanelOpen : !rightPanelOpen),
    toggleAllPanels: () => {
      const anyOpen = leftPanelOpen || rightPanelOpen;

      if (chosenMode === "preview") setModeState("edit");
      setPanelsBeforePreview(null);
      applyPanels({ left: !anyOpen, right: !anyOpen && !isCompact });
    },
    closePanels: () => applyPanels({ left: false, right: false }),
    paletteOpen,
    setPaletteOpen,
    libraryTab,
    setLibraryTab: changeLibraryTab,
    showLibrary: (tab: LibraryTab) => {
      changeLibraryTab(tab);
      if (!leftPanelOpen) setPanelOpen("left", true);
      setLibrarySearchRequest(count => count + 1);
    },
    librarySearchRequest
  };

  return (
    <EditorUiContext.Provider value={value}>
      {children}
    </EditorUiContext.Provider>
  );
}

export function useEditorUi() {
  const context = useContext(EditorUiContext);

  if (!context) {
    throw new Error("useEditorUi must be used within an EditorUiProvider");
  }

  return context;
}
