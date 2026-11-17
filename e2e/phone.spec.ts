import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { newInvoiceOnPhone, phoneLibrary, showPhoneLibrary } from "./helpers";

// Group: the editor on a phone, which edits in a form and shows the page,
// fitted and read-only, on its Page tab (issue #213).
test.use({
  viewport: { width: 390, height: 664 },
  hasTouch: true,
  isMobile: true
});

function pageScale(page: Page) {
  return page
    .locator("[data-paper]")
    .evaluate(paper =>
      Number(/scale\(([\d.]+)\)/.exec(paper.style.transform)?.[1])
    );
}

function tabBar(page: Page) {
  return page.getByRole("navigation", { name: "Editor" });
}

// The bar steps aside while a field is typed in, so whatever was being typed
// is left first, as tapping Done would.
async function showPage(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await tabBar(page).getByRole("tab", { name: "Page" }).tap();
  await expect.poll(() => pageScale(page)).toBeLessThan(0.6);
}

test("a phone edits in a form, typed at 16px, with the bar out of the way", async ({
  page
}) => {
  await page.goto("/create");
  const toDetails = page.getByRole("textbox", { name: "To details" });

  await expect(page.getByRole("form", { name: "Invoice" })).toBeVisible();
  await expect(page.locator("[data-paper]")).toHaveCount(0);
  // 16px or more, so iOS doesn't zoom in on a field it focuses.
  expect(
    await toDetails.evaluate(field =>
      parseFloat(getComputedStyle(field).fontSize)
    )
  ).toBeGreaterThanOrEqual(16);

  await toDetails.tap();
  await toDetails.fill("Globex Corp");

  // The bar steps aside for the keyboard while a field is typed in.
  await expect(tabBar(page)).toBeHidden();

  await toDetails.blur();

  await expect(tabBar(page)).toBeVisible();
});

test("the form's controls are 44px tap targets", async ({ page }) => {
  await page.goto("/create");
  await expect(page.getByRole("form", { name: "Invoice" })).toBeVisible();

  const smallTargets = await page.locator("[data-phone-form]").evaluate(form =>
    Array.from(
      form.querySelectorAll<HTMLElement>(
        "button, input:not([type=file]):not([aria-hidden=true]), select, textarea"
      )
    )
      .filter(control => control.offsetParent !== null)
      .filter(control => {
        const rect = control.getBoundingClientRect();
        const after = getComputedStyle(control, "::after");
        const height = Math.max(rect.height, parseFloat(after.height) || 0);
        const width = Math.max(rect.width, parseFloat(after.width) || 0);

        return height < 44 || width < 44;
      })
      .map(control => control.getAttribute("aria-label") ?? control.textContent)
  );

  expect(smallTargets).toEqual([]);
});

test("the Page tab shows the page, and tapping a field opens it in the form", async ({
  page
}) => {
  await page.goto("/create");
  await page.getByRole("textbox", { name: "To details" }).fill("Globex Corp");
  await showPage(page);

  await expect(page.getByRole("form", { name: "Invoice" })).toHaveCount(0);

  // In Preview a field's wrapper takes the tap, which Playwright reads as the
  // field being covered; the tap still lands where a finger would.
  await page
    .locator('[data-paper] [data-field="client.content"]')
    .tap({ force: true });

  const toDetails = page.getByRole("textbox", { name: "To details" });

  // The bar has stepped aside for the keyboard, so it's read while hidden.
  await expect(page.locator("#phone-tab-form")).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(toDetails).toBeFocused();
  await expect(toDetails).toBeInViewport();
});

test("a printed heading is the field that renames it", async ({ page }) => {
  await page.goto("/create");

  const toLabel = page.getByRole("textbox", { name: "To label" });

  await toLabel.fill("Bill To");
  await toLabel.press("Enter");

  await expect(toLabel).not.toBeFocused();
  await expect(
    page.getByRole("region", { name: "Bill To", exact: true })
  ).toBeVisible();

  await showPage(page);

  // The page's labels are fields, so it's their values that are read.
  await expect
    .poll(() =>
      page
        .locator("[data-paper]")
        .evaluate(paper =>
          Array.from(
            paper.querySelectorAll<HTMLInputElement>("input, textarea"),
            field => field.value
          )
        )
    )
    .toContain("Bill To");
});

test("only a label that prints is a field", async ({ page }) => {
  await page.goto("/create");

  const paymentPart = page.getByRole("region", { name: "Payment details" });
  const ibanLabel = paymentPart.getByRole("textbox", { name: "IBAN label" });

  await expect(ibanLabel).toHaveCount(0);

  await paymentPart
    .getByRole("textbox", { name: "IBAN", exact: true })
    .fill("DE89 3704 0044 0532 0130 00");

  await expect(ibanLabel).toBeVisible();
});

test("tapping a label on the page focuses its field in the form", async ({
  page
}) => {
  await page.goto("/create");
  await showPage(page);
  await page
    .locator('[data-paper] [data-field="client.label"]')
    .tap({ force: true });

  const toLabel = page.locator('[data-phone-form] [data-field="client.label"]');

  await expect(toLabel).toBeFocused();
  await expect(toLabel).toBeInViewport();
});

test("a totals row is typed in its own box, shown once", async ({ page }) => {
  await page.goto("/create");

  const totals = page.getByRole("region", { name: "Totals" });
  const taxRate = totals.getByRole("textbox", { name: "Tax rate" });

  await taxRate.fill("20");

  await expect(taxRate).toHaveValue("20");
  await expect(totals.getByText(/^comes to /)).toBeVisible();
  await expect(totals.getByText("Rate (%)")).toHaveCount(0);
});

test("phones get a tab bar instead of the canvas pill and panel toggles", async ({
  page
}) => {
  await page.goto("/create");
  await expect(tabBar(page)).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Canvas" })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Show invoices panel" })
  ).toBeHidden();
  await expect(tabBar(page).getByRole("tab")).toHaveText(["Edit", "Page"]);
  await expect(tabBar(page).getByRole("button")).toHaveText(["Style"]);
  await expect(tabBar(page).getByRole("tab", { name: "Edit" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("Style opens a tray over the page, which keeps its zoom under it", async ({
  page
}) => {
  await page.goto("/create");

  const style = tabBar(page).getByRole("button", { name: "Style" });
  const tray = page.getByRole("region", { name: "Style" });
  const paper = page.locator("[data-paper]");

  await showPage(page);

  const pageWidth = (await paper.boundingBox())?.width ?? 0;

  await style.tap();

  // Styling shows on the page, so Style switches to it under the tray.
  await expect(tabBar(page).getByRole("tab", { name: "Page" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(tray).toBeInViewport();
  await expect(style).toHaveAttribute("aria-expanded", "true");
  await expect(tray.getByRole("tab", { name: "Text" })).toBeFocused();

  // The page isn't zoomed out to fit above the tray; it scrolls instead, far
  // enough to bring its foot up above the tray.
  expect((await paper.boundingBox())?.width).toBeCloseTo(pageWidth, 0);

  const trayTop = (await tray.boundingBox())?.y ?? 0;

  await paper.evaluate(element => {
    const canvas = element.closest("section");

    if (canvas) canvas.scrollTop = canvas.scrollHeight;
  });
  await expect
    .poll(async () => {
      const box = await paper.boundingBox();

      return box ? box.y + box.height : Infinity;
    })
    .toBeLessThanOrEqual(trayTop);

  // The text size shows on the page as it's picked, below 16px too.
  const clientText = page.locator('[data-paper] [data-field="client.content"]');
  const textSize = () =>
    clientText.evaluate(element =>
      parseFloat(getComputedStyle(element).fontSize)
    );
  const sizes = tray.getByRole("group", { name: "Text size" });

  await sizes.getByRole("button", { name: "Small" }).tap();

  const smallSize = await textSize();

  expect(smallSize).toBeLessThan(16);

  await sizes.getByRole("button", { name: "Large" }).tap();
  await expect.poll(textSize).toBeGreaterThan(smallSize);

  // Each tab fits without scrolling.
  for (const name of ["Text", "Colour", "Table"]) {
    await tray.getByRole("tab", { name }).tap();

    const panel = tray.getByRole("tabpanel");

    expect(
      await panel.evaluate(
        element => element.scrollHeight - element.clientHeight
      )
    ).toBeLessThanOrEqual(1);
  }

  // A colour's picker or code field keeps the tab bar, which the tray sits
  // on, so neither the tray nor the page under it moves.
  await tray.getByRole("tab", { name: "Colour" }).tap();

  const trayTopBefore = (await tray.boundingBox())?.y;

  for (const field of ["Text colour", "Text colour code"]) {
    await tray.getByLabel(field, { exact: true }).focus();
    await expect(tabBar(page)).toBeVisible();
    expect((await tray.boundingBox())?.y).toBe(trayTopBefore);
  }

  // Tapping the page only closes the tray: it stays on the page.
  await page
    .locator('[data-paper] [data-field="client.content"]')
    .tap({ force: true });

  await expect(style).toHaveAttribute("aria-expanded", "false");
  await expect(tabBar(page).getByRole("tab", { name: "Page" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

  await style.tap();
  await page.keyboard.press("Escape");

  await expect(style).toHaveAttribute("aria-expanded", "false");
  await expect(style).toBeFocused();
});

test("the invoice list is the screen the editor is pushed over", async ({
  page
}) => {
  await page.goto("/create");
  await page.getByRole("textbox", { name: "To details" }).fill("Globex Corp");
  await showPhoneLibrary(page);

  const library = phoneLibrary(page);

  await expect(library).not.toHaveAttribute("inert");

  for (const name of ["Invoices", "Templates"]) {
    const button = library
      .getByRole("group", { name: "Library" })
      .getByRole("button", { name });

    await expect(button).toBeInViewport();
    await expect
      .poll(async () => (await button.boundingBox())?.height)
      .toBeGreaterThanOrEqual(44);
  }

  // The invoice just left is written as the list shows, so its row is there.
  const row = library.getByRole("button", { name: /Globex Corp/ }).first();

  await expect(row).toHaveAttribute("aria-current", "true");

  await row.tap();

  await expect(library).toHaveAttribute("inert", "");
  await expect(page.getByRole("textbox", { name: "To details" })).toHaveValue(
    "Globex Corp"
  );

  // Opening it from the list added a step, so the browser's back returns to
  // the list rather than leaving the editor.
  await page.goBack();

  await expect(library).not.toHaveAttribute("inert");
  await expect(page).toHaveURL(/\/create$/);

  await page.goForward();

  await expect(library).toHaveAttribute("inert", "");
});

test("New invoice from the list opens the next invoice at its top", async ({
  page
}) => {
  await page.goto("/create");
  await page.getByRole("textbox", { name: "To details" }).fill("Globex Corp");
  await showPage(page);
  await newInvoiceOnPhone(page);

  await expect(tabBar(page).getByRole("tab", { name: "Edit" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("textbox", { name: "To details" })).toHaveValue(
    ""
  );
  await expect(page.getByLabel("Invoice title")).toBeInViewport();
  // Numbered after the one just left in the library, not INV-0001 again.
  await expect(page.getByLabel("Invoice No.", { exact: true })).toHaveValue(
    "INV-0002"
  );

  // New invoice again from this untouched blank goes back to it rather than
  // starting another, so the form is still where it was scrolled to (another
  // invoice would open at its top).
  const form = page.locator("[data-phone-form]");

  await form.evaluate(scroller => scroller.scrollTo({ top: 300 }));
  await newInvoiceOnPhone(page);

  expect(await form.evaluate(scroller => scroller.scrollTop)).toBeGreaterThan(
    0
  );
});

test("the setup choices sit in the form", async ({ page }) => {
  await page.goto("/create");

  const form = page.getByRole("form", { name: "Invoice" });

  await form.getByLabel("Type", { exact: true }).selectOption("quote");

  await expect(page.getByLabel("Invoice title")).toHaveValue("Quote");

  for (const name of [
    "Language",
    "Paper",
    "Date format",
    "Number format",
    "Symbol"
  ]) {
    await expect(form.getByLabel(name, { exact: true })).toBeVisible();
  }
});

test("a tap outside an open menu only closes it", async ({ page }) => {
  await page.goto("/create");

  const pageTab = tabBar(page).getByRole("tab", { name: "Page" });
  const box = await pageTab.boundingBox();

  if (!box) throw new Error("The Page tab isn't shown");

  await page.getByRole("button", { name: "Document menu" }).tap();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByRole("menu")).toBeHidden();
  await expect(pageTab).toHaveAttribute("aria-selected", "false");
});

test("a phone opens to the form even when Preview was left on", async ({
  page
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("editor-mode", JSON.stringify("preview"))
  );
  await page.goto("/create");

  await expect(
    page.getByRole("textbox", { name: "To details" })
  ).toBeEditable();
});

// How two screenshots of the same size compare, worked out in the page's own
// canvas: the mean difference per channel (0 to 255) between them, and how
// sharp each is, as the mean change between neighbouring pixels. A stretched
// copy of a smaller page loses a quarter or more of its sharpness, while
// text drawn again at the same zoom only differs in its anti-aliasing.
async function compareImages(page: Page, first: Buffer, second: Buffer) {
  return await page.evaluate(
    async ([firstBase64, secondBase64]) => {
      async function readPixels(base64: string) {
        const image = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${base64}`)).blob()
        );
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d");

        if (!context) throw new Error("No 2D canvas");

        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, image.width, image.height);
      }

      function sharpness({ data, width, height }: ImageData) {
        let total = 0;

        for (let y = 0; y < height - 1; y++) {
          for (let x = 0; x < width - 1; x++) {
            const i = (y * width + x) * 4;

            total +=
              Math.abs(data[i] - data[i + 4]) +
              Math.abs(data[i] - data[i + width * 4]);
          }
        }

        return total / (width * height);
      }

      const [pixelsA, pixelsB] = await Promise.all([
        readPixels(firstBase64),
        readPixels(secondBase64)
      ]);
      let total = 0;

      for (let i = 0; i < pixelsA.data.length; i++) {
        total += Math.abs(pixelsA.data[i] - pixelsB.data[i]);
      }

      return {
        difference: total / pixelsA.data.length,
        sharpness: [sharpness(pixelsA), sharpness(pixelsB)]
      };
    },
    [first.toString("base64"), second.toString("base64")] as const
  );
}

test("a pinch zooms the page sharp the whole way, not just once it ends", async ({
  page,
  browserName
}) => {
  test.skip(
    browserName !== "chromium",
    "Two-finger touches are sent through Chrome DevTools"
  );

  await page.goto("/create");
  await showPage(page);

  const cdp = await page.context().newCDPSession(page);
  const desk = page.locator("main section").first();
  const box = await desk.boundingBox();

  if (!box) throw new Error("The desk has no box");

  // Pinched over the line items, so there's text to judge the sharpness by.
  const items = await page
    .locator('[data-paper] [data-field-area="items"]')
    .boundingBox();

  if (!items) throw new Error("The line items have no box");

  const centre = {
    x: box.x + box.width / 2,
    y: items.y + items.height / 2
  };
  const fingers = (spread: number) => [
    { x: centre.x - spread, y: centre.y, id: 0 },
    { x: centre.x + spread, y: centre.y, id: 1 }
  ];

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: fingers(40)
  });

  for (let spread = 50; spread <= 120; spread += 10) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: fingers(spread)
    });
    await page.evaluate(
      () => new Promise(resolve => requestAnimationFrame(resolve))
    );
  }

  // Mid-pinch: the page is scaled by a plain 2D transform that's never
  // given its own layer (which would be stretched rather than redrawn), and
  // the desk doesn't scroll under the fingers.
  const midPinch = await page.locator("[data-paper]").evaluate(paper => {
    const sizer = paper.parentElement;
    const section = sizer?.parentElement;

    return {
      transform: sizer ? getComputedStyle(sizer).transform : "",
      willChange: sizer ? getComputedStyle(sizer).willChange : "",
      overflow: section ? getComputedStyle(section).overflow : ""
    };
  });

  expect(midPinch.transform).toMatch(/^matrix\(/);
  expect(midPinch.willChange).toBe("auto");
  expect(midPinch.overflow).toBe("hidden");

  const duringPinch = await page.screenshot({ clip: box });

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: []
  });
  await expect.poll(() => pageScale(page)).toBeGreaterThan(0.9);
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(resolve))
  );

  const afterPinch = await page.screenshot({ clip: box });

  // What the pinch showed is what it settled on: drawn in the same place, and
  // as sharp, not a stretched, blurry copy of the smaller page.
  const { difference, sharpness } = await compareImages(
    page,
    duringPinch,
    afterPinch
  );
  const [sharpnessDuring, sharpnessAfter] = sharpness;

  expect(difference).toBeLessThan(2);
  expect(sharpnessDuring / sharpnessAfter).toBeGreaterThan(0.95);
  await expect(desk).toHaveCSS("overflow", "auto");
});
