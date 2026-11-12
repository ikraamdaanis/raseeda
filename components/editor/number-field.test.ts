// @vitest-environment happy-dom
import { act, createElement, useSyncExternalStore } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NumberField } from "~/components/editor/number-field";
import { EditorUiProvider } from "~/context/editor-ui-context";
import type { MoneyFormat } from "~/types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const COMMA_DECIMAL: MoneyFormat = {
  marker: "€",
  numberFormat: "dot-comma",
  position: "after",
  decimals: 2
};
const DOT_DECIMAL: MoneyFormat = {
  marker: "$",
  numberFormat: "comma-dot",
  position: "before",
  decimals: 2
};

let container: HTMLDivElement;
let root: Root;
let stored: number[];
// The invoice's number, which the field writes and outside changes replace.
let current = 0;
const listeners = new Set<() => void>();

function setOutside(value: number) {
  current = value;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function Harness({
  money,
  max,
  min
}: {
  money: MoneyFormat;
  max?: number;
  min?: number;
}) {
  const value = useSyncExternalStore(subscribe, () => current);

  return createElement(NumberField, {
    "aria-label": "Number",
    value,
    money,
    decimals: 2,
    min,
    max,
    onChange: (next: number) => {
      stored.push(next);
      setOutside(next);
    }
  });
}

function render({
  initial,
  ...props
}: Parameters<typeof Harness>[0] & { initial: number }) {
  current = initial;

  act(() => {
    root.render(
      createElement(EditorUiProvider, null, createElement(Harness, props))
    );
  });
}

function input() {
  const element = container.querySelector("input");

  if (!element) throw new Error("No input rendered");

  return element;
}

function focus() {
  act(() => input().focus());
}

function blur() {
  act(() => input().blur());
}

// Sets the field's text as typing would, through the setter React tracks.
function type(text: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;

  act(() => {
    setter?.call(input(), text);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  stored = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NumberField", () => {
  it("keeps '5,' on a comma-decimal invoice while typing and stores 5", () => {
    render({ money: COMMA_DECIMAL, initial: 0 });
    focus();
    type("5,");

    expect(input().value).toBe("5,");
    expect(stored.at(-1)).toBe(5);
  });

  it("keeps '5.' on a dot-decimal invoice while typing and stores 5", () => {
    render({ money: DOT_DECIMAL, initial: 0 });
    focus();
    type("5.");

    expect(input().value).toBe("5.");
    expect(stored.at(-1)).toBe(5);
  });

  it("reads a comma-decimal invoice's dot as grouping", () => {
    render({ money: COMMA_DECIMAL, initial: 0 });
    focus();
    type("1.250,5");

    expect(input().value).toBe("1250,5");
    expect(stored.at(-1)).toBe(1250.5);
  });

  it("clamps a percentage to 0 to 100", () => {
    render({ money: DOT_DECIMAL, initial: 0, min: 0, max: 100 });
    focus();
    type("400");

    expect(input().value).toBe("100");
    expect(stored.at(-1)).toBe(100);

    type("-5");

    expect(input().value).toBe("5");
    expect(stored.at(-1)).toBe(5);
  });

  it("shows an outside change when not focused", () => {
    render({ money: COMMA_DECIMAL, initial: 1.5 });

    expect(input().value).toBe("1,5");

    act(() => setOutside(7.25));

    expect(input().value).toBe("7,25");
  });

  it("shows an outside change while focused and after blur", () => {
    render({ money: DOT_DECIMAL, initial: 0 });
    focus();
    type("5.");
    act(() => setOutside(12));

    expect(input().value).toBe("12");

    blur();
    act(() => setOutside(3));

    expect(input().value).toBe("3");
  });

  it("stores 0 when cleared", () => {
    render({ money: DOT_DECIMAL, initial: 42 });
    focus();
    type("");

    expect(stored.at(-1)).toBe(0);

    blur();

    expect(input().value).toBe("0");
  });
});
