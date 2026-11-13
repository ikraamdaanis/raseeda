import type { ReactNode } from "react";
import { AddSectionSlot } from "~/components/editor/invoice-add-section";
import { InvoiceCanvas } from "~/components/editor/invoice-canvas";
import { InvoiceClientDetails } from "~/components/editor/invoice-client-details";
import { InvoiceDetails } from "~/components/editor/invoice-details";
import { InvoiceExchangeRate } from "~/components/editor/invoice-exchange-rate";
import { InvoiceFooterSections } from "~/components/editor/invoice-footer-sections";
import { InvoiceImage } from "~/components/editor/invoice-image";
import { InvoiceLineItems } from "~/components/editor/invoice-line-items";
import { InvoicePaymentDetails } from "~/components/editor/invoice-payment-details";
import { InvoicePricing } from "~/components/editor/invoice-pricing";
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
import { PhoneTabBar } from "~/components/editor/shell/phone-tab-bar";
import {
  PanelBackdrop,
  PanelToggle,
  SidePanel
} from "~/components/editor/shell/side-panel";
import { CanvasViewProvider } from "~/context/canvas-view-context";
import { EditorUiProvider, useEditorUi } from "~/context/editor-ui-context";
import { FileActionsProvider } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";

// The editor. Every edit saves itself, so leaving needs no confirmation:
// whatever is waiting is written as the editor unmounts.
export function InvoiceEditor() {
  return (
    <CanvasViewProvider>
      <EditorUiProvider>
        <FileActionsProvider>
          <EditorShortcuts />
          <HistoryShortcuts />
          <CommandPalette />
          <div className="flex h-dvh w-full flex-col">
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
                <CanvasArea />
                <CanvasPill />
              </Desk>
              <PanelBackdrop />
              <SidePanel side="right" label="Inspector">
                <Inspector />
              </SidePanel>
            </div>
            <PhoneTabBar />
          </div>
        </FileActionsProvider>
      </EditorUiProvider>
    </CanvasViewProvider>
  );
}

// The canvas between the panels. Behind a phone's panel sheet it is out of
// reach, so focus and screen readers stay in the sheet.
function Desk({ children }: { children: ReactNode }) {
  const { isNarrow, leftPanelOpen, rightPanelOpen } = useEditorUi();

  return (
    <main
      inert={isNarrow && (leftPanelOpen || rightPanelOpen)}
      className="bg-desk relative flex min-w-0 flex-1 flex-col"
    >
      {children}
    </main>
  );
}

function CanvasArea() {
  return (
    <InvoiceCanvas>
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
        <AddSectionSlot area="shipping" className="-mt-2" />
      </div>
      <div className="flex flex-1 flex-col items-start">
        <InvoiceDetails />
        <AddSectionSlot area="details" className="mt-1" />
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
        <AddSectionSlot area="totals" className="mt-1 flex justify-end" />
        <InvoiceExchangeRate />
      </div>
      <InvoicePaymentDetails />
      <InvoiceFooterSections />
      <AddSectionSlot area="footer" className="mt-6" />
    </>
  );
}
