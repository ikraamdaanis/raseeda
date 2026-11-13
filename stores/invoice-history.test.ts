// @vitest-environment happy-dom
import fc from "fast-check";
import { isEqual } from "lodash-es";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithOrigin } from "~/stores/change-origin";
import {
  HISTORY_LIMIT,
  clearInvoiceHistory,
  closeHistoryStep,
  noteComposition,
  noteFocusChange,
  notePaste,
  recordHistoryAction,
  redoInvoiceChange,
  setInvoiceHistoryEnabled,
  startInvoiceHistory,
  undoInvoiceChange,
  useInvoiceHistory
} from "~/stores/invoice-history";
import { selectInvoiceData } from "~/stores/invoice-selectors";
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";
import type { Invoice, InvoiceSectionKey } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";

function store() {
  return useInvoiceStore.getState();
}

function data(): Invoice {
  return selectInvoiceData(store());
}

// A field on the page, focused, as typing into it would have it.
function focusField(path: string, label: string) {
  const existing = document.querySelector<HTMLInputElement>(
    `[data-field="${path}"]`
  );
  const input = existing ?? document.createElement("input");

  input.dataset.field = path;
  input.setAttribute("aria-label", label);

  if (!existing) document.body.append(input);

  input.focus();
  noteFocusChange();

  return input;
}

function blurAll() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  noteFocusChange();
}

function loadBlank() {
  runWithOrigin("load", () => store().setInvoice(createBlankInvoice()));
  clearInvoiceHistory();
}

describe("invoice history", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    document.body.innerHTML = "";
    startInvoiceHistory();
    setInvoiceHistoryEnabled(true);
    loadBlank();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes typing in one field one step", () => {
    const start = data();

    focusField("title", "Invoice title");
    store().setTitle("Q");
    vi.advanceTimersByTime(200);
    store().setTitle("Qu");
    vi.advanceTimersByTime(200);
    store().setTitle("Quote");

    expect(useInvoiceHistory.getState()).toMatchObject({
      canUndo: true,
      undoLabel: "Invoice title"
    });

    undoInvoiceChange();

    expect(data()).toEqual(start);
    expect(useInvoiceHistory.getState().canUndo).toBe(false);
  });

  it("undoes a language preset in one step, labels typed before it included", () => {
    blurAll();
    store().setLabels(labels => ({ ...labels, subtotal: "Net" }));
    closeHistoryStep();

    const beforePreset = data();

    recordHistoryAction("Language", "page", () => {
      store().setLabelLanguage("de");
    });

    expect(data().labels.subtotal).toBe("Zwischensumme");
    expect(data().title).toBe("Rechnung");
    expect(useInvoiceHistory.getState().undoLabel).toBe("Language");

    undoInvoiceChange();

    expect(data()).toEqual(beforePreset);
    expect(data().labels.subtotal).toBe("Net");
  });

  it("starts a new step after a 500ms pause", () => {
    focusField("title", "Invoice title");
    store().setTitle("Q");
    vi.advanceTimersByTime(600);
    store().setTitle("Quote");

    undoInvoiceChange();

    expect(data().title).toBe("Q");
  });

  it("starts a new step when focus moves to another field", () => {
    focusField("title", "Invoice title");
    store().setTitle("Quote");
    focusField("number", "Invoice No.");
    store().setNumber("INV-9");
    // Back to the first field: still a new step.
    focusField("title", "Invoice title");
    store().setTitle("Quotes");

    undoInvoiceChange();
    expect(data().title).toBe("Quote");
    undoInvoiceChange();
    expect(data().number).toBe("INV-0001");
    undoInvoiceChange();
    expect(data().title).toBe("Invoice");
  });

  it("makes a paste a step of its own", () => {
    focusField("title", "Invoice title");
    store().setTitle("Q");
    notePaste();
    store().setTitle("Q pasted");
    store().setTitle("Q pasted!");

    undoInvoiceChange();
    expect(data().title).toBe("Q pasted");
    undoInvoiceChange();
    expect(data().title).toBe("Q");
  });

  it("keeps an IME composition together however long it takes", () => {
    focusField("title", "Invoice title");
    noteComposition(true);
    store().setTitle("ｋ");
    vi.advanceTimersByTime(900);
    store().setTitle("か");
    noteComposition(false);
    vi.advanceTimersByTime(1);
    store().setTitle("かx");

    undoInvoiceChange();
    expect(data().title).toBe("か");
    undoInvoiceChange();
    expect(data().title).toBe("Invoice");
  });

  it("makes each discrete action its own step, with what changed", async () => {
    blurAll();
    store().setSection("logo", false);
    // A separate click comes in a later task.
    await Promise.resolve();
    store().setSection("tax", false);

    expect(useInvoiceHistory.getState().undoLabel).toBe("Tax");

    undoInvoiceChange();
    expect(data().sections.tax).toBe(true);
    expect(data().sections.logo).toBe(false);
    undoInvoiceChange();
    expect(data().sections.logo).toBe(true);
  });

  it("names the invoice a credit note refers to", () => {
    blurAll();
    store().setRefersTo("INV-0042");

    expect(useInvoiceHistory.getState().undoLabel).toBe("Refers to invoice");

    undoInvoiceChange();
    expect(data().refersTo).toBe("");
  });

  it("names how a receipt was paid", () => {
    blurAll();
    store().setPaidBy("Card");

    expect(useInvoiceHistory.getState().undoLabel).toBe("Paid by");

    undoInvoiceChange();
    expect(data().paidBy).toBe("");
  });

  it("makes a type change one step that puts the labels back", () => {
    blurAll();
    store().setDocumentType("quote");

    expect(useInvoiceHistory.getState().undoLabel).toBe("Document type");
    expect(data().title).toBe("Quote");
    expect(data().labels.paymentDue).toBe("Valid until");

    undoInvoiceChange();
    expect(data().documentType).toBe("invoice");
    expect(data().title).toBe("Invoice");
    expect(data().labels.paymentDue).toBe("Due date");
  });

  it("names a way to pay added by a button as payment details", () => {
    blurAll();
    store().setPaymentDetails(prev => ({
      ...prev,
      methods: [{ id: "m1", name: "Venmo", detail: "" }]
    }));

    expect(useInvoiceHistory.getState().undoLabel).toBe("Payment details");
  });

  it("keeps changes made together, like a picked date, in one step", () => {
    blurAll();
    store().setInvoiceDate("2026-01-01");
    store().setDueDate("2026-01-31");

    expect(useInvoiceHistory.getState().undoLabel).toBe("Date");

    undoInvoiceChange();

    expect(data().invoiceDate).not.toBe("2026-01-01");
    expect(data().dueDate).not.toBe("2026-01-31");
    expect(useInvoiceHistory.getState().canUndo).toBe(false);
  });

  it("records nothing for a change that changes nothing", () => {
    focusField("title", "Invoice title");
    store().setTitle("Invoice");

    expect(useInvoiceHistory.getState().canUndo).toBe(false);
  });

  it("clears redo on a new change", () => {
    focusField("title", "Invoice title");
    store().setTitle("Quote");
    undoInvoiceChange();

    expect(useInvoiceHistory.getState().canRedo).toBe(true);

    focusField("number", "Invoice No.");
    store().setNumber("INV-2");

    expect(useInvoiceHistory.getState().canRedo).toBe(false);
  });

  it("doesn't record loading an invoice", () => {
    runWithOrigin("load", () => store().setTitle("Loaded"));

    expect(useInvoiceHistory.getState().canUndo).toBe(false);
  });

  it("keeps the newest steps up to the limit", () => {
    blurAll();

    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      store().setTitle(`Title ${i}`);
      closeHistoryStep();
    }

    let steps = 0;

    while (undoInvoiceChange()) steps++;

    expect(steps).toBe(HISTORY_LIMIT);
    expect(data().title).toBe("Title 19");
  });

  it("does nothing while switched off", () => {
    blurAll();
    store().setTitle("Edited");
    setInvoiceHistoryEnabled(false);

    expect(undoInvoiceChange()).toBe(false);
    expect(data().title).toBe("Edited");
    expect(useInvoiceHistory.getState().canUndo).toBe(false);
  });
});

// A setting with a control on the page and another in the inspector, both
// carrying its data-field path.
describe("putting focus back", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);

      return 0;
    });
    document.body.innerHTML = "";
    startInvoiceHistory();
    setInvoiceHistoryEnabled(true);
    loadBlank();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function addControl(label: string) {
    const control = document.createElement("button");

    control.dataset.field = "tax.perLine";
    control.setAttribute("aria-label", label);
    document.body.append(control);

    return control;
  }

  it("keeps focus on the control that made the change", () => {
    addControl("Toggle tax per line");
    const inspectorSwitch = addControl("Tax per line");

    inspectorSwitch.focus();
    noteFocusChange();
    store().setTax(tax => ({ ...tax, perLine: true }));
    undoInvoiceChange();

    expect(store().tax.perLine).toBe(false);
    expect(document.activeElement).toBe(inspectorSwitch);
  });

  it("skips a control that can't take focus", () => {
    const hidden = document.createElement("div");

    hidden.setAttribute("inert", "");
    document.body.append(hidden);
    const pageToggle = addControl("Toggle tax per line");
    hidden.append(pageToggle);
    const inspectorSwitch = addControl("Tax per line");

    inspectorSwitch.focus();
    noteFocusChange();
    store().setTax(tax => ({ ...tax, perLine: true }));
    blurAll();
    undoInvoiceChange();

    expect(document.activeElement).toBe(inspectorSwitch);
  });
});

// Every kind of edit the editor makes, as discrete steps.
const editArbitrary = fc.oneof(
  fc.record({ kind: fc.constant("title"), value: fc.string({ maxLength: 8 }) }),
  fc.record({
    kind: fc.constant("number"),
    value: fc.string({ maxLength: 8 })
  }),
  fc.record({
    kind: fc.constant("addItem"),
    price: fc.integer({ min: 0, max: 5000 })
  }),
  fc.record({ kind: fc.constant("removeItem"), index: fc.nat(5) }),
  fc.record({
    kind: fc.constant("quantity"),
    index: fc.nat(5),
    value: fc.integer({ min: 0, max: 99 })
  }),
  fc.record({
    kind: fc.constant("tax"),
    value: fc.integer({ min: 0, max: 30 })
  }),
  fc.record({
    kind: fc.constant("discount"),
    value: fc.integer({ min: 0, max: 100 })
  }),
  fc.record({
    kind: fc.constant("section"),
    section: fc.constantFrom<InvoiceSectionKey>(
      "tax",
      "discounts",
      "fees",
      "amountPaid"
    ),
    on: fc.boolean()
  }),
  fc.record({
    kind: fc.constant("paid"),
    value: fc.integer({ min: 0, max: 1000 })
  })
);

type Edit =
  typeof editArbitrary extends fc.Arbitrary<infer TEdit> ? TEdit : never;

let itemSequence = 0;

function applyEdit(edit: Edit) {
  const items = store().items;

  switch (edit.kind) {
    case "title":
      store().setTitle(edit.value);
      break;
    case "number":
      store().setNumber(edit.value);
      break;
    case "addItem":
      store().addItem({
        id: `item-${itemSequence++}`,
        description: "Work",
        quantity: 1,
        unit: "",
        unitPrice: edit.price
      });
      break;
    case "removeItem":
      if (items.length > 1)
        store().removeItem(items[edit.index % items.length].id);
      break;
    case "quantity":
      store().updateItem(edit.index % items.length, "quantity", edit.value);
      break;
    case "tax":
      store().setTax(tax => ({ ...tax, percentage: edit.value }));
      break;
    case "discount":
      store().setDiscounts(edit.value);
      break;
    case "section":
      store().setSection(edit.section, edit.on);
      break;
    case "paid":
      store().setAmountPaid(edit.value);
      break;
  }

  closeHistoryStep();
}

describe("invoice history properties", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    startInvoiceHistory();
    setInvoiceHistoryEnabled(true);
  });

  it("undoing every step returns the starting invoice", () => {
    fc.assert(
      fc.property(fc.array(editArbitrary, { maxLength: 40 }), edits => {
        loadBlank();
        blurAll();

        const start = data();

        edits.forEach(applyEdit);

        while (undoInvoiceChange()) {
          // Undo all the way back.
        }

        expect(data()).toEqual(start);
      })
    );
  });

  it("undo then redo changes nothing", () => {
    fc.assert(
      fc.property(
        fc.array(editArbitrary, { minLength: 1, maxLength: 40 }),
        fc.nat(40),
        (edits, undoCount) => {
          loadBlank();
          blurAll();
          edits.forEach(applyEdit);

          const end = data();
          let undone = 0;

          while (undone < undoCount && undoInvoiceChange()) undone++;
          while (redoInvoiceChange()) {
            // Redo all the way forward.
          }

          expect(data()).toEqual(end);
        }
      )
    );
  });

  it("totals always match calculateInvoiceTotals, and are never stored", () => {
    fc.assert(
      fc.property(fc.array(editArbitrary, { maxLength: 30 }), edits => {
        loadBlank();
        blurAll();

        // Each state the invoice passed through; an edit that changed nothing
        // made no step.
        const states: Invoice[] = [data()];

        for (const edit of edits) {
          applyEdit(edit);

          const next = data();

          if (!isEqual(next, states.at(-1))) states.push(next);
        }

        for (let step = states.length - 2; step >= 0; step--) {
          expect(undoInvoiceChange()).toBe(true);

          const shown = data();

          expect(shown).not.toHaveProperty("total");
          expect(shown).not.toHaveProperty("subtotal");
          expect(shown.items[0]).not.toHaveProperty("amount");
          expect(calculateInvoiceTotals(shown)).toEqual(
            calculateInvoiceTotals(states[step])
          );
        }

        expect(undoInvoiceChange()).toBe(false);
      })
    );
  });
});
