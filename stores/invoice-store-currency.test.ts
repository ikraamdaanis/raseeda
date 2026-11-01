import { beforeEach, describe, expect, it } from "vitest";
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";

function store() {
  return useInvoiceStore.getState();
}

// A GBP invoice also shown in USD at a quoted rate.
beforeEach(() => {
  store().setInvoice({
    ...createBlankInvoice(),
    currency: "£",
    currencyCode: "GBP",
    currencyConversion: {
      currency: "$",
      currencyCode: "USD",
      rate: 1.2875,
      date: "2026-10-30",
      source: "Bank of England rate"
    }
  });
});

describe("setCurrency", () => {
  it("clears the rate and its date when the invoice currency changes", () => {
    store().setCurrency("€", "EUR");

    expect(store().currencyConversion).toEqual({
      currency: "$",
      currencyCode: "USD",
      rate: 0,
      date: "",
      source: "Bank of England rate"
    });
  });

  it("keeps the rate when the same currency is picked again", () => {
    store().setCurrency("£", "GBP");

    expect(store().currencyConversion.rate).toBe(1.2875);
  });

  it("moves the second currency off the one the invoice now uses", () => {
    store().setCurrency("$", "USD");

    expect(store().currencyConversion).toMatchObject({
      currency: "£",
      currencyCode: "GBP",
      rate: 0,
      date: ""
    });
  });
});

describe("setSecondCurrency", () => {
  it("clears the rate and its date for a new second currency", () => {
    store().setSecondCurrency("Rs", "INR");

    expect(store().currencyConversion).toEqual({
      currency: "Rs",
      currencyCode: "INR",
      rate: 0,
      date: "",
      source: "Bank of England rate"
    });
  });

  it("keeps the rate when the same second currency is picked again", () => {
    store().setSecondCurrency("$", "USD");

    expect(store().currencyConversion.rate).toBe(1.2875);
  });
});
