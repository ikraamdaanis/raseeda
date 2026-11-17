import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  focusFormTarget,
  PhoneForm
} from "~/components/editor/form/phone-form";
import { InvoiceCanvas } from "~/components/editor/invoice-canvas";
import { InvoiceClientDetails } from "~/components/editor/invoice-client-details";
import { InvoiceDetails } from "~/components/editor/invoice-details";
import { InvoiceExchangeRate } from "~/components/editor/invoice-exchange-rate";
import { InvoiceFooterSections } from "~/components/editor/invoice-footer-sections";
import { InvoiceImage } from "~/components/editor/invoice-image";
import { InvoiceLineItems } from "~/components/editor/invoice-line-items";
import { InvoicePaymentDetails } from "~/components/editor/invoice-payment-details";
import {
  InvoicePricing,
  InvoiceTotalsSlot
} from "~/components/editor/invoice-pricing";
import { InvoiceSellerDetails } from "~/components/editor/invoice-seller-details";
import { InvoiceShipping } from "~/components/editor/invoice-shipping";
import { InvoiceTitle } from "~/components/editor/invoice-title";
import { CanvasPill } from "~/components/editor/shell/canvas-pill";
import { CommandPalette } from "~/components/editor/shell/command-palette";
import { DocumentStatusBanner } from "~/components/editor/shell/document-status-banner";
import { EditorShortcuts } from "~/components/editor/shell/editor-shortcuts";
import { EditorTopBar } from "~/components/editor/shell/editor-top-bar";
import { HistoryShortcuts } from "~/components/editor/shell/history-shortcuts";
import { InspectorPanel } from "~/components/editor/shell/inspector/inspector-panel";
import { InvoicesPanel } from "~/components/editor/shell/invoices-panel";
import {
  EditorScreen,
  PhoneLibraryScreen
} from "~/components/editor/shell/phone-screens";
import { PhoneTabBar } from "~/components/editor/shell/phone-tab-bar";
import { PanelToggle, SidePanel } from "~/components/editor/shell/side-panel";
import { StyleTray } from "~/components/editor/shell/style-tray";
import { CanvasViewProvider } from "~/context/canvas-view-context";
import { EditorUiProvider, useEditorUi } from "~/context/editor-ui-context";
import { FileActionsProvider } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";

// The editor. Every edit saves itself, so leaving needs no confirmation:
// whatever is waiting is written as the editor unmounts. Its root is isolated
// so its own layers (the phone's editor screen, the Style tray) stack inside
// it, under menus and dialogs: an open menu's backdrop then takes the tap that
// closes it, rather than the form under it.
export function InvoiceEditor() {
  return (
    <CanvasViewProvider>
      <EditorUiProvider>
        <FileActionsProvider>
          <EditorShortcuts />
          <HistoryShortcuts />
          <CommandPalette />
          <div className="relative isolate flex h-dvh w-full flex-col overflow-hidden [--style-tray-height:min(21rem,52dvh)]">
            <PhoneLibraryScreen />
            <EditorScreen>
              <EditorTopBar
                start={<PanelToggle side="left" />}
                end={<PanelToggle side="right" />}
              />
              <div className="relative flex min-h-0 flex-1">
                <SidePanel side="left" label="Invoices">
                  <InvoicesPanel />
                </SidePanel>
                <Desk>
                  <DocumentStatusBanner />
                  <DeskContent />
                  <CanvasPill />
                </Desk>
                <SidePanel side="right" label="Inspector">
                  <Inspector />
                </SidePanel>
                <StyleTray />
              </div>
              <PhoneTabBar />
            </EditorScreen>
          </div>
        </FileActionsProvider>
      </EditorUiProvider>
    </CanvasViewProvider>
  );
}

// The canvas between the panels. On a phone, tapping the page while the Style
// tray is open closes the tray.
// Only a pointer's tap: the keyboard closes the tray with Escape or its ×.
function Desk({ children }: { children: ReactNode }) {
  const { isNarrow, rightPanelOpen, closePanels } = useEditorUi();
  const deskRef = useRef<HTMLElement>(null);
  const closesTray = isNarrow && rightPanelOpen;

  useEffect(() => {
    const desk = deskRef.current;

    if (!closesTray || !desk) return;

    desk.addEventListener("click", closePanels);

    return () => desk.removeEventListener("click", closePanels);
  }, [closesTray, closePanels]);

  return (
    <main
      ref={deskRef}
      className="bg-desk relative flex min-w-0 flex-1 flex-col"
    >
      {children}
    </main>
  );
}

// A phone edits in a form and reads the page on its Page tab, so only one of
// them is on screen (and in the document) at a time: each field's
// `data-field` path names one control. Tapping a field on the page opens the
// form at it, unless the Style tray is open: then the tap only closes the
// tray. The page keeps its zoom under the tray, with room to scroll its foot
// up above it.
function DeskContent() {
  const { isNarrow, phoneView, setPhoneView, rightPanelOpen, closePanels } =
    useEditorUi();
  const { currentDocumentId } = useInvoiceDocument();
  const formScrollTopRef = useRef(0);

  // Another document opens the form at its top, even one opened while the
  // form was off screen (from the list, over the Page tab).
  useEffect(() => {
    formScrollTopRef.current = 0;
  }, [currentDocumentId]);

  function openInForm(target: { field?: string; area?: string }) {
    flushSync(() => setPhoneView("form"));
    focusFormTarget(target);
  }

  if (!isNarrow) return <CanvasArea />;

  if (phoneView === "form")
    return <PhoneForm scrollTopRef={formScrollTopRef} />;

  return (
    <CanvasArea
      onFieldTap={rightPanelOpen ? closePanels : openInForm}
      insetBottom={
        rightPanelOpen ? "calc(var(--style-tray-height) + 0.75rem)" : undefined
      }
    />
  );
}

function CanvasArea({
  onFieldTap,
  insetBottom
}: {
  onFieldTap?: (target: { field?: string; area?: string }) => void;
  insetBottom?: string;
}) {
  return (
    <InvoiceCanvas onFieldTap={onFieldTap} insetBottom={insetBottom}>
      <Top />
      <Mid />
      <Bottom />
    </InvoiceCanvas>
  );
}

// The inspector changes the invoice, so it's out of reach while this tab can't
// edit it (another tab is editing it, or it was deleted).
function Inspector() {
  const { status } = useInvoiceDocument();
  const canEdit = status === "editing" || status === "unavailable";

  return (
    <div inert={!canEdit} className="flex min-h-0 flex-1 flex-col">
      <InspectorPanel />
    </div>
  );
}

function Top() {
  return (
    <div className="flex flex-row items-start justify-between gap-4">
      <div className="flex w-full flex-col gap-4">
        <InvoiceTitle />
        <InvoiceSellerDetails />
      </div>
      <InvoiceImage />
    </div>
  );
}

function Mid() {
  return (
    <div className="mt-2 flex justify-between gap-8">
      <div className="flex flex-1 flex-col gap-4">
        <InvoiceClientDetails />
        <InvoiceShipping />
      </div>
      <div className="flex flex-1 flex-col items-start">
        <InvoiceDetails />
      </div>
    </div>
  );
}

function Bottom() {
  return (
    <>
      <div className="mt-6 max-w-full">
        <InvoiceLineItems />
        <InvoicePricing />
        <InvoiceExchangeRate />
        <InvoiceTotalsSlot />
      </div>
      <InvoicePaymentDetails />
      <InvoiceFooterSections />
    </>
  );
}
