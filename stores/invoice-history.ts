import { isEqual } from "lodash-es";
import { create } from "zustand";
import { getChangeOrigin, runWithOrigin } from "~/stores/change-origin";
import {
  INVOICE_DATA_KEYS,
  selectInvoiceData
} from "~/stores/invoice-selectors";
import type { InvoiceStore } from "~/stores/invoice-store";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { Invoice, InvoiceSectionKey } from "~/types";

// Undo and redo for the whole invoice, as snapshots of its data (Lexical,
// zundo and redux-undo work the same way). An invoice is a few KB, so keeping
// a couple of hundred costs little, and going back is one setInvoice with no
// inverse operations to get wrong. Totals are derived, so they're never kept.
//
// Steps follow ProseMirror and CodeMirror: typing in one field is one step,
// until it pauses for 500ms or focus moves, and every discrete action (a
// switch, a date picked, a row added or removed) is a step of its own. Undo
// only reaches back through this invoice in this tab: opening another invoice,
// or another tab writing this one, starts the history afresh.

const HISTORY_GROUP_MS = 500;

export const HISTORY_LIMIT = 200;

// Where the caret was in a field, so undo can put it back.
type FieldFocus = {
  field: string;
  selectionStart: number | null;
  selectionEnd: number | null;
};

type HistoryEntry = {
  // On the undo stack the invoice before the step; on the redo stack, after.
  snapshot: Invoice;
  // `field:<data-field path>` for typing, `action:<n>` for a discrete action.
  groupKey: string;
  at: number;
  // What changed, for "Undo change to Due date".
  label: string;
  // The part of the page to flash when there's no field to focus.
  area: string;
  before: FieldFocus | null;
  after: FieldFocus | null;
};

let undoStack: HistoryEntry[] = [];
let redoStack: HistoryEntry[] = [];
let lastChangeAt = 0;
// The next change starts a new step whatever it is (focus moved, a paste, an
// undo).
let boundary = true;
let closeAfterNextChange = false;
let composing = false;
let enabled = true;
let actionSequence = 0;
let actionOpen = false;
let namedAction: { key: string; label: string; area: string } | null = null;
// Where the caret was just before the input that's being recorded.
let selectionBeforeInput: FieldFocus | null = null;

// What the menus and buttons show.
export const useInvoiceHistory = create<{
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}>(() => ({
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null
}));

function publish() {
  const undoTop = undoStack.at(-1);
  const redoTop = redoStack.at(-1);

  useInvoiceHistory.setState({
    canUndo: enabled && !!undoTop,
    canRedo: enabled && !!redoTop,
    undoLabel: undoTop?.label ?? null,
    redoLabel: redoTop?.label ?? null
  });
}

// The labels on the page for the parts of an invoice an action can change.
const SECTION_NAMES: Record<InvoiceSectionKey, string> = {
  logo: "Logo",
  poNumber: "PO number",
  servicePeriod: "Service period",
  supplyDate: "Date of supply",
  shipping: "Shipping address",
  discounts: "Discounts",
  tax: "Tax",
  fees: "Fees",
  amountPaid: "Amount paid",
  paidStamp: "Paid stamp",
  currencyConversion: "Second currency",
  paymentDetails: "Payment details",
  notes: "Notes",
  terms: "Terms",
  latePayment: "Late payment",
  signature: "Signature"
};

const SECTION_AREAS: Record<InvoiceSectionKey, string> = {
  logo: "logo",
  poNumber: "details",
  servicePeriod: "details",
  supplyDate: "details",
  shipping: "shipping",
  discounts: "pricing",
  tax: "pricing",
  fees: "pricing",
  amountPaid: "pricing",
  paidStamp: "title",
  currencyConversion: "pricing",
  paymentDetails: "paymentDetails",
  notes: "notes",
  terms: "terms",
  latePayment: "latePayment",
  signature: "signature"
};

function describeAction(
  previous: Invoice,
  next: Invoice
): { label: string; area: string } {
  const changed = INVOICE_DATA_KEYS.filter(
    key => !isEqual(previous[key], next[key])
  );
  const key = changed[0];

  switch (key) {
    case "sections": {
      const section = (Object.keys(next.sections) as InvoiceSectionKey[]).find(
        candidate => previous.sections[candidate] !== next.sections[candidate]
      );

      return section
        ? { label: SECTION_NAMES[section], area: SECTION_AREAS[section] }
        : { label: "Sections", area: "page" };
    }
    case "refersTo":
      return {
        label: next.labels.refersTo || "Refers to invoice",
        area: "details"
      };
    case "invoiceDate":
      return { label: next.labels.invoiceDate || "Date", area: "details" };
    case "dueDate":
      return { label: next.labels.paymentDue || "Due date", area: "details" };
    case "paidBy":
      return { label: next.labels.paidBy || "Paid by", area: "details" };
    case "supplyDate":
      return {
        label: next.labels.supplyDate || "Date of supply",
        area: "details"
      };
    case "currencyConversion":
      return { label: "Exchange rate", area: "pricing" };
    case "items":
      return { label: "Line items", area: "items" };
    case "image":
      return { label: "Logo", area: "logo" };
    case "signature":
      return { label: "Signature", area: "signature" };
    case "theme":
      return { label: "Style", area: "page" };
    case "dateFormat":
      return { label: "Date format", area: "page" };
    case "numberFormat":
      return { label: "Number format", area: "page" };
    case "currencyPosition":
      return { label: "Currency position", area: "page" };
    case "paperSize":
      return { label: "Paper size", area: "page" };
    case "documentType":
      return { label: "Document type", area: "title" };
    case "currency":
    case "currencyCode":
      return { label: "Currency", area: "page" };
    case "tax":
      return { label: next.labels.tax || "Tax", area: "pricing" };
    case "discounts":
    case "discountType":
      return { label: next.labels.discounts || "Discounts", area: "pricing" };
    case "fees":
      return { label: next.labels.fees || "Fees", area: "pricing" };
    case "amountPaid":
      return {
        label: next.labels.amountPaid || "Amount paid",
        area: "pricing"
      };
    case "paidDate":
      return { label: "Payment date", area: "pricing" };
    case "paymentDetails":
      return {
        label: next.paymentDetails.label.trim() || "Payment details",
        area: "paymentDetails"
      };
    default:
      return { label: "Invoice", area: "page" };
  }
}

function isUnchanged(previous: InvoiceStore, next: InvoiceStore) {
  if (INVOICE_DATA_KEYS.every(key => previous[key] === next[key])) return true;

  return isEqual(selectInvoiceData(previous), selectInvoiceData(next));
}

function fieldElement(element: Element | null): HTMLElement | null {
  const field = element?.closest<HTMLElement>("[data-field]");

  return field ?? null;
}

function focusedField(): HTMLElement | null {
  return typeof document === "undefined"
    ? null
    : fieldElement(document.activeElement);
}

function readFocus(element: HTMLElement): FieldFocus {
  const field = element.dataset.field ?? "";

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return {
      field,
      selectionStart: element.selectionStart,
      selectionEnd: element.selectionEnd
    };
  }

  return { field, selectionStart: null, selectionEnd: null };
}

function fieldLabel(element: HTMLElement): string {
  const label =
    element.getAttribute("aria-label") ??
    (element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
      ? element.labels?.[0]?.textContent
      : null);

  return label?.trim() || "Invoice";
}

function fieldArea(element: HTMLElement): string {
  return (
    element.closest<HTMLElement>("[data-field-area]")?.dataset.fieldArea ??
    "page"
  );
}

// Changes made together in one go (picking a date sets the invoice and due
// dates) share a step; the next action starts its own.
function actionGroupKey() {
  if (!actionOpen) {
    actionSequence++;
    actionOpen = true;
    queueMicrotask(() => {
      actionOpen = false;
    });
  }

  return `action:${actionSequence}`;
}

function record(state: InvoiceStore, previous: InvoiceStore) {
  if (getChangeOrigin() !== "edit" || !enabled) return;
  if (isUnchanged(previous, state)) return;

  const now = Date.now();
  const before = selectInvoiceData(previous);
  const field = namedAction ? null : focusedField();
  const action =
    namedAction ??
    (field ? null : describeAction(before, selectInvoiceData(state)));
  const groupKey = namedAction
    ? namedAction.key
    : field
      ? `field:${field.dataset.field}`
      : actionGroupKey();
  const top = undoStack.at(-1);
  const joins =
    !!top &&
    !boundary &&
    top.groupKey === groupKey &&
    (composing || now - lastChangeAt <= HISTORY_GROUP_MS || !field);

  if (top && joins) {
    top.after = field ? readFocus(field) : top.after;
  } else {
    const fieldPath = field?.dataset.field;
    const selectionBefore =
      field && selectionBeforeInput?.field === fieldPath
        ? selectionBeforeInput
        : null;

    undoStack.push({
      snapshot: before,
      groupKey,
      at: now,
      label: field ? fieldLabel(field) : (action?.label ?? "Invoice"),
      area: field ? fieldArea(field) : (action?.area ?? "page"),
      before: field
        ? (selectionBefore ?? {
            field: fieldPath ?? "",
            selectionStart: null,
            selectionEnd: null
          })
        : null,
      after: field ? readFocus(field) : null
    });

    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  }

  lastChangeAt = now;
  boundary = closeAfterNextChange;
  closeAfterNextChange = false;
  redoStack = [];
  publish();
}

let unsubscribeStore: (() => void) | null = null;

// Starts recording edits to the invoice store. Idempotent.
export function startInvoiceHistory() {
  unsubscribeStore ??= useInvoiceStore.subscribe(record);
}

export function stopInvoiceHistory() {
  unsubscribeStore?.();
  unsubscribeStore = null;
}

// Forgets every step, when another invoice opens or another tab writes this
// one.
export function clearInvoiceHistory() {
  undoStack = [];
  redoStack = [];
  lastChangeAt = 0;
  boundary = true;
  publish();
}

// Turns undo and redo off while the invoice can't be edited here (another tab
// is editing it), and back on.
export function setInvoiceHistoryEnabled(next: boolean) {
  enabled = next;
  publish();
}

// Ends the current step, so the next change starts a new one.
export function closeHistoryStep() {
  boundary = true;
}

// Runs a set of changes as one named step, such as restoring a version.
export function recordHistoryAction(
  label: string,
  area: string,
  update: () => void
) {
  actionSequence++;
  namedAction = { key: `action:${actionSequence}`, label, area };
  boundary = true;

  try {
    update();
  } finally {
    namedAction = null;
    boundary = true;
  }
}

function cssEscape(value: string) {
  return typeof CSS !== "undefined"
    ? CSS.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}

// The field a step changed. Some settings have a control on the page and one
// in the inspector with the same path: the one in use keeps focus, otherwise
// the first that can take it.
function findField(path: string): HTMLElement | null {
  const fields = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-field="${cssEscape(path)}"]`)
  ).filter(field => !field.closest("[inert]"));

  return (
    fields.find(field => field === document.activeElement) ??
    fields.at(0) ??
    null
  );
}

// Puts focus and the caret back in the field a step changed and scrolls it
// into view. With no field to go to (a switch, a removed row), the part of
// the page that changed flashes instead.
function showChange(focus: FieldFocus | null, area: string) {
  if (typeof document === "undefined") return;

  requestAnimationFrame(() => {
    const field = focus ? findField(focus.field) : null;

    if (focus && field) {
      field.focus({ preventScroll: true });

      if (
        (field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement) &&
        focus.selectionStart !== null
      ) {
        const end = Math.min(
          focus.selectionEnd ?? focus.selectionStart,
          field.value.length
        );

        field.setSelectionRange(Math.min(focus.selectionStart, end), end);
      }

      field.scrollIntoView({ block: "nearest", inline: "nearest" });

      return;
    }

    const region =
      document.querySelector<HTMLElement>(
        `[data-field-area="${cssEscape(area)}"]`
      ) ?? document.querySelector<HTMLElement>("[data-paper]");

    if (!region) return;

    region.scrollIntoView({ block: "nearest", inline: "nearest" });
    region.removeAttribute("data-history-flash");
    // Restart the animation when the same area changes twice in a row.
    void region.offsetWidth;
    region.setAttribute("data-history-flash", "");
    window.setTimeout(() => region.removeAttribute("data-history-flash"), 900);
  });
}

function apply(snapshot: Invoice, focus: FieldFocus | null, area: string) {
  runWithOrigin("history", () => {
    useInvoiceStore.getState().setInvoice(structuredClone(snapshot));
  });
  boundary = true;
  publish();
  showChange(focus, area);
}

export function undoInvoiceChange(): boolean {
  if (!enabled) return false;

  const entry = undoStack.pop();

  if (!entry) return false;

  redoStack.push({
    ...entry,
    snapshot: selectInvoiceData(useInvoiceStore.getState())
  });
  apply(entry.snapshot, entry.before, entry.area);

  return true;
}

export function redoInvoiceChange(): boolean {
  if (!enabled) return false;

  const entry = redoStack.pop();

  if (!entry) return false;

  undoStack.push({
    ...entry,
    snapshot: selectInvoiceData(useInvoiceStore.getState())
  });
  apply(entry.snapshot, entry.after, entry.area);

  return true;
}

// Notes where the caret is just before an input changes a field, so undoing
// the step puts it back there rather than where the typing ended.
export function noteSelectionBeforeInput(target: EventTarget | null) {
  const field = target instanceof Element ? fieldElement(target) : null;

  selectionBeforeInput = field ? readFocus(field) : null;
}

// Focus moving, a paste or an IME composition each mark where a step ends.
export function noteFocusChange() {
  boundary = true;
}

export function notePaste() {
  boundary = true;
  closeAfterNextChange = true;
}

// An IME composition is one step once it ends. Some browsers send the
// composed text in an input right after compositionend, so the step closes
// once that has had its turn.
export function noteComposition(active: boolean) {
  if (active) {
    composing = true;
    boundary = true;

    return;
  }

  composing = false;
  window.setTimeout(() => {
    boundary = true;
  }, 0);
}
