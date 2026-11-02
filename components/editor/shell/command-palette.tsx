import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCopy,
  IconCurrencyDollar,
  IconDeviceFloppy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconFile,
  IconFilePlus,
  IconFolderOpen,
  IconHistory,
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconTypography,
  IconUpload,
  IconZoomScan
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  redoLabel,
  undoLabel
} from "~/components/editor/shell/history-buttons";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "~/components/ui/command";
import {
  currencyOptions,
  getCurrencyCodeForSymbol,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";
import { EDITOR_THEME_OPTIONS } from "~/consts/editor-theme-options";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { useCanvasView } from "~/context/canvas-view-context";
import { useEditorUi } from "~/context/editor-ui-context";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { watchInvoices } from "~/db";
import { useEditorTheme } from "~/hooks/use-editor-theme";
import { useInvoicePdf } from "~/hooks/use-invoice-pdf";
import { useSecondCurrency } from "~/hooks/use-second-currency";
import {
  redoInvoiceChange,
  undoInvoiceChange,
  useInvoiceHistory
} from "~/stores/invoice-history";
import {
  useCurrencySlice,
  useSectionsSlice,
  useThemeSlice
} from "~/stores/invoice-selectors";
import type { InvoiceDocument, InvoiceSectionKey, InvoiceSize } from "~/types";
import { shortcutLabel } from "~/utils/shortcut-label";

const SECTION_LABELS: Record<InvoiceSectionKey, string> = {
  logo: "logo",
  poNumber: "PO number",
  servicePeriod: "service period",
  supplyDate: "date of supply",
  shipping: "shipping address",
  discounts: "discounts",
  tax: "tax",
  fees: "fees",
  amountPaid: "amount paid",
  paidStamp: "paid stamp",
  currencyConversion: "second currency",
  paymentDetails: "payment details",
  notes: "notes",
  terms: "terms",
  latePayment: "late payment fee"
};

const SIZE_LABELS: Record<InvoiceSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large"
};

// ⌘K: every editor action, searchable, as in Framer and Linear. Running one
// closes the palette first, so a dialog it opens takes focus cleanly.
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useEditorUi();

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      title="Quick actions"
      description="Search for an action to run"
      className="max-w-[min(36rem,calc(100vw-2rem))] sm:max-w-xl"
    >
      <Command loop className="rounded-xl! p-0">
        <CommandInput placeholder="Type a command or search" />
        {paletteOpen && <PaletteCommands />}
      </Command>
    </CommandDialog>
  );
}

function PaletteCommands() {
  const { setPaletteOpen, mode, toggleMode, leftPanelOpen, rightPanelOpen } =
    useEditorUi();
  const { togglePanel, toggleAllPanels } = useEditorUi();
  const actions = useFileActions();
  const { downloadPdf, openPdf } = useInvoicePdf();
  const { setView } = useCanvasView();
  const { preference, setPreference } = useEditorTheme();
  const { theme, setTheme } = useThemeSlice();
  const { currency, setCurrency } = useCurrencySlice();
  const { sections, setSection } = useSectionsSlice();
  const secondCurrency = useSecondCurrency();
  const { libraryDocumentId, isRecord, status } = useInvoiceDocument();
  const history = useInvoiceHistory();
  const canEdit = status === "editing" || status === "unavailable";
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const selectedCurrency = normalizeCurrency(currency);

  useEffect(() => watchInvoices(setInvoices, () => setInvoices([])), []);

  function run(action: () => void) {
    return () => {
      setPaletteOpen(false);
      action();
    };
  }

  return (
    <CommandList className="max-h-[min(24rem,60vh)] p-1.5">
      <CommandEmpty>No actions match.</CommandEmpty>
      <CommandGroup heading="Invoice">
        <PaletteItem
          icon={<IconDownload />}
          onSelect={run(downloadPdf)}
          keywords={["pdf", "export", "save"]}
        >
          Download PDF
        </PaletteItem>
        <PaletteItem
          icon={<IconExternalLink />}
          onSelect={run(openPdf)}
          keywords={["pdf", "print", "view", "tab"]}
        >
          Open PDF in a new tab
        </PaletteItem>
        <PaletteItem icon={<IconFilePlus />} onSelect={run(actions.newInvoice)}>
          New invoice
        </PaletteItem>
        <PaletteItem
          icon={<IconFolderOpen />}
          onSelect={run(actions.showOpenInvoice)}
          shortcut="⌘O"
        >
          Open invoice…
        </PaletteItem>
        {isRecord && status === "editing" && (
          <PaletteItem
            icon={<IconCopy />}
            onSelect={run(actions.duplicateCurrent)}
            shortcut="⇧⌘S"
            keywords={["copy", "save as"]}
          >
            Duplicate invoice
          </PaletteItem>
        )}
        {isRecord && (
          <PaletteItem
            icon={<IconHistory />}
            onSelect={run(actions.showVersionHistory)}
            keywords={["versions", "restore", "revert"]}
          >
            Version history…
          </PaletteItem>
        )}
        <PaletteItem
          icon={<IconFile />}
          onSelect={run(actions.showOpenTemplate)}
        >
          Open template…
        </PaletteItem>
        <PaletteItem
          icon={<IconDeviceFloppy />}
          onSelect={run(actions.saveAsTemplate)}
        >
          Save as template…
        </PaletteItem>
        <PaletteItem
          icon={<IconDownload />}
          onSelect={run(actions.exportData)}
          keywords={["backup", "json"]}
        >
          Export data
        </PaletteItem>
        <PaletteItem
          icon={<IconUpload />}
          onSelect={run(actions.importData)}
          keywords={["restore", "json"]}
        >
          Import data…
        </PaletteItem>
      </CommandGroup>
      {(history.canUndo || history.canRedo) && (
        <CommandGroup heading="Edit">
          {history.canUndo && (
            <PaletteItem
              icon={<IconArrowBackUp />}
              onSelect={run(() => undoInvoiceChange())}
              shortcut="⌘Z"
            >
              {undoLabel(history.undoLabel)}
            </PaletteItem>
          )}
          {history.canRedo && (
            <PaletteItem
              icon={<IconArrowForwardUp />}
              onSelect={run(() => redoInvoiceChange())}
              shortcut="⇧⌘Z"
            >
              {redoLabel(history.redoLabel)}
            </PaletteItem>
          )}
        </CommandGroup>
      )}
      <CommandGroup heading="View">
        <PaletteItem icon={<IconEye />} onSelect={run(toggleMode)} shortcut="P">
          {mode === "preview" ? "Back to editing" : "Preview the PDF"}
        </PaletteItem>
        <PaletteItem
          icon={<IconZoomScan />}
          onSelect={run(() => setView("fit"))}
          shortcut="⇧1"
        >
          Zoom to fit
        </PaletteItem>
        <PaletteItem
          icon={<IconZoomScan />}
          onSelect={run(() => setView(1))}
          shortcut="⇧0"
        >
          Zoom to 100%
        </PaletteItem>
        <PaletteItem
          icon={<IconLayoutSidebar />}
          onSelect={run(() => togglePanel("left"))}
        >
          {leftPanelOpen ? "Hide invoices panel" : "Show invoices panel"}
        </PaletteItem>
        <PaletteItem
          icon={<IconLayoutSidebarRight />}
          onSelect={run(() => togglePanel("right"))}
        >
          {rightPanelOpen ? "Hide inspector" : "Show inspector"}
        </PaletteItem>
        <PaletteItem
          icon={<IconLayoutSidebar />}
          onSelect={run(toggleAllPanels)}
          shortcut="⌘\"
        >
          {leftPanelOpen || rightPanelOpen ? "Hide panels" : "Show panels"}
        </PaletteItem>
        {EDITOR_THEME_OPTIONS.filter(option => option.value !== preference).map(
          option => (
            <PaletteItem
              key={option.value}
              icon={<option.icon />}
              onSelect={run(() => setPreference(option.value))}
              keywords={["theme", "appearance", option.label]}
            >
              {option.command}
            </PaletteItem>
          )
        )}
      </CommandGroup>
      {canEdit && (
        <CommandGroup heading="Sections">
          {(Object.keys(SECTION_LABELS) as InvoiceSectionKey[])
            .filter(section => section !== "currencyConversion")
            .map(section => (
              <PaletteItem
                key={section}
                onSelect={run(() => setSection(section, !sections[section]))}
              >
                {`${sections[section] ? "Hide" : "Show"} ${SECTION_LABELS[section]}`}
              </PaletteItem>
            ))}
          <PaletteItem
            onSelect={run(
              secondCurrency.isOn ? secondCurrency.remove : secondCurrency.add
            )}
            keywords={["currency", "exchange rate", "conversion"]}
          >
            {secondCurrency.isOn
              ? "Remove second currency"
              : "Add second currency"}
          </PaletteItem>
        </CommandGroup>
      )}
      {canEdit && (
        <CommandGroup heading="Font">
          {INVOICE_FONTS.map(font => (
            <PaletteItem
              key={font.id}
              icon={<IconTypography />}
              checked={theme.font === font.id}
              onSelect={run(() =>
                setTheme(previous => ({
                  ...previous,
                  font: font.id,
                  fontWeight: font.weights.includes(previous.fontWeight)
                    ? previous.fontWeight
                    : "Normal"
                }))
              )}
            >
              {`Font: ${font.name}`}
            </PaletteItem>
          ))}
          {(Object.keys(SIZE_LABELS) as InvoiceSize[]).map(size => (
            <PaletteItem
              key={size}
              icon={<IconTypography />}
              checked={theme.size === size}
              onSelect={run(() =>
                setTheme(previous => ({ ...previous, size }))
              )}
            >
              {`Text size: ${SIZE_LABELS[size]}`}
            </PaletteItem>
          ))}
        </CommandGroup>
      )}
      {canEdit && (
        <CommandGroup heading="Currency">
          {currencyOptions.map(option => (
            <PaletteItem
              key={option.symbol}
              icon={<IconCurrencyDollar />}
              checked={selectedCurrency === option.symbol}
              onSelect={run(() =>
                setCurrency(
                  option.symbol,
                  getCurrencyCodeForSymbol(option.symbol)
                )
              )}
            >
              {`Currency: ${getCurrencyMarker(option.symbol)} ${option.label} (${option.code})`}
            </PaletteItem>
          ))}
        </CommandGroup>
      )}
      {invoices.length > 0 && (
        <CommandGroup heading="Saved invoices">
          {invoices
            .filter(document => document.id !== libraryDocumentId)
            .map(document => (
              <PaletteItem
                key={document.id}
                icon={<IconFolderOpen />}
                onSelect={run(() => actions.openInvoice(document.id))}
              >
                {`Open ${document.name}`}
              </PaletteItem>
            ))}
        </CommandGroup>
      )}
    </CommandList>
  );
}

function PaletteItem({
  icon,
  shortcut,
  checked = false,
  keywords,
  onSelect,
  children
}: {
  icon?: ReactNode;
  shortcut?: string;
  checked?: boolean;
  keywords?: string[];
  onSelect: () => void;
  children: string;
}) {
  return (
    <CommandItem
      value={children}
      keywords={keywords}
      onSelect={onSelect}
      data-checked={checked}
      className="h-9 gap-2.5 px-2.5 text-[13px]"
    >
      {icon && (
        <span aria-hidden="true" className="flex opacity-70">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
      {shortcut && <CommandShortcut>{shortcutLabel(shortcut)}</CommandShortcut>}
    </CommandItem>
  );
}
