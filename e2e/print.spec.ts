import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { clickFileMenuItem, gotoEditorReady, pressShortcut } from "./helpers";

// Counts calls to the editor page's own print, which would print the editor
// rather than the invoice. Frames the page adds keep theirs.
async function countPagePrints(page: Page) {
  await page.addInitScript(() => {
    if (window !== window.top) return;

    Object.assign(window, { pagePrints: 0 });
    window.print = () => {
      Object.assign(window, {
        pagePrints: Number(Reflect.get(window, "pagePrints")) + 1
      });
    };
  });
}

// The page size of the PDF in the print frame, in points.
async function printFramePageSize(page: Page) {
  await expect(page.locator("iframe[data-print-frame]")).toHaveAttribute(
    "src",
    /^blob:/,
    { timeout: 30_000 }
  );

  return page.evaluate(async () => {
    const frame = document.querySelector("iframe[data-print-frame]");

    if (!(frame instanceof HTMLIFrameElement)) return null;

    const response = await fetch(frame.src);
    const text = new TextDecoder("latin1").decode(await response.arrayBuffer());
    const mediaBox = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(text);

    return {
      type: response.headers.get("content-type"),
      isPdf: text.startsWith("%PDF"),
      width: Math.round(Number(mediaBox?.[1])),
      height: Math.round(Number(mediaBox?.[2]))
    };
  });
}

async function setPaperSize(page: Page, paperSize: "A4" | "Letter") {
  const select = page.locator("#inspector-paper-size");

  if (!(await select.isVisible())) {
    await page.getByRole("tab", { name: "Format" }).click();
  }

  await select.selectOption(paperSize);
  await expect(select).toHaveValue(paperSize);
}

test.describe("in desktop Chrome", () => {
  test("⌘P prints the invoice's Letter PDF, not the editor", async ({
    page
  }) => {
    const policyErrors: string[] = [];

    page.on("console", message => {
      if (/Content.Security.Policy/i.test(message.text())) {
        policyErrors.push(message.text());
      }
    });
    await countPagePrints(page);
    await gotoEditorReady(page);
    await setPaperSize(page, "Letter");
    await pressShortcut(page, "Mod+p");

    expect(await printFramePageSize(page)).toEqual({
      type: "application/pdf",
      isPdf: true,
      width: 612,
      height: 792
    });
    expect(await page.evaluate(() => Reflect.get(window, "pagePrints"))).toBe(
      0
    );
    expect(policyErrors).toEqual([]);
  });

  test("Print in the project menu prints an A4 invoice's A4 PDF", async ({
    page
  }) => {
    await countPagePrints(page);
    await gotoEditorReady(page);
    await setPaperSize(page, "A4");
    await clickFileMenuItem(page, "Print");

    expect(await printFramePageSize(page)).toEqual({
      type: "application/pdf",
      isPdf: true,
      width: 595,
      height: 842
    });
    expect(await page.evaluate(() => Reflect.get(window, "pagePrints"))).toBe(
      0
    );
  });
});

test.describe("in Safari", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15"
  });

  test("Print opens the PDF in a new tab", async ({ page }) => {
    await gotoEditorReady(page);

    const pdfPagePromise = page.context().waitForEvent("page");

    await clickFileMenuItem(page, "Print");

    const pdfPage = await pdfPagePromise;

    expect(pdfPage.isClosed()).toBe(false);
    await expect(page.locator("iframe[data-print-frame]")).toHaveCount(0);
  });
});
