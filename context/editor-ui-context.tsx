import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import {
  readStoredValue,
  writeStoredValue
} from "~/hooks/use-persistent-state";
import type { LibraryTab } from "~/types";

declare module "@tanstack/history" {
  interface HistoryState {
    // On the entry a phone adds as it opens a document from the invoice list,
    // so going back from that document returns to the list (issue #213).
    phoneEditor?: boolean;
  }
}

type EditorMode = "edit" | "preview";

type PhoneView = "form" | "page";

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
// All three are remembered across reloads. A phone edits in a form instead of
// on the page (issue #213): its Edit and Page tabs (`phoneView`) say which one
// shows, and the Page tab is the page in Preview. It always opens on Edit, and
// a wider window's own Preview comes back when there is room again.
// On a phone the left panel is the invoice list, a full screen the editor is
// pushed over, and the right one is the Style tray over the Page tab. Opening
// a document from the list adds a history entry, so the browser's back
// returns to the list; the editor's back button steps back through it when
// it's there. Only those two slide: a back from the browser swaps the screens,
// since Safari's swipe already plays its own animation.
const EditorUiContext = createContext<{
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  toggleMode: () => void;
  isNarrow: boolean;
  phoneView: PhoneView;
  setPhoneView: (view: PhoneView) => void;
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
  // Whether the phone's list and editor slide as they swap.
  phoneSlides: boolean;
  showPhoneList: () => void;
  // Shows the editor over the list, once the document chosen there is open.
  showPhoneEditor: () => void;
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
  const [phoneView, setPhoneView] = useState<PhoneView>("form");
  const [phoneSlides, setPhoneSlides] = useState(false);
  const isNarrow = useMediaQuery(NARROW_VIEWPORT_QUERY);
  const isCompact = useMediaQuery(COMPACT_VIEWPORT_QUERY);
  const router = useRouter();
  // Set while the back button's own step back is on its way, so the list it
  // brings back slides in.
  const backSlidesRef = useRef(false);
  // Both panels can be remembered open from a wider window; a compact one
  // shows only the inspector, and both come back when there is room again.
  const leftPanelOpen = panels.left && !(isCompact && panels.right);
  const rightPanelOpen = panels.right;
  const phoneMode = phoneView === "page" ? "preview" : "edit";
  const mode = isNarrow ? phoneMode : chosenMode;

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

  const onHistoryStep = useEffectEvent(() => {
    const slides = backSlidesRef.current;

    backSlidesRef.current = false;

    // A step off `/create` is leaving the editor, not going to the list.
    if (!isNarrow || router.history.location.pathname !== "/create") return;

    const showsEditor = router.history.location.state.phoneEditor === true;

    setPhoneSlides(slides);
    applyPanels(showsEditor ? ALL_CLOSED : { left: true, right: false });
  });

  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        if (action.type !== "PUSH" && action.type !== "REPLACE") {
          onHistoryStep();
        }
      }),
    [router]
  );

  function showPhoneList() {
    if (router.history.location.state.phoneEditor === true) {
      backSlidesRef.current = true;
      router.history.back();

      return;
    }

    setPhoneSlides(true);
    applyPanels({ left: true, right: false });
  }

  function showPhoneEditor() {
    if (leftPanelOpen) {
      setPhoneSlides(true);
      router.history.push(router.history.location.href, { phoneEditor: true });
    }

    applyPanels(ALL_CLOSED);
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
    phoneView,
    setPhoneView,
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
    librarySearchRequest,
    phoneSlides,
    showPhoneList,
    showPhoneEditor
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
