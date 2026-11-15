import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Group: the editor on a phone, where the A4 page is fitted to the screen and
// tapping a field zooms in to it.
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

test("tapping a field zooms in to it and Done fits the page", async ({
  page
}) => {
  await page.goto("/create");
  const toDetails = page.getByLabel("To details");
  await expect(toDetails).toBeVisible();
  await expect.poll(() => pageScale(page)).toBeLessThan(0.6);

  await toDetails.tap();

  // A phone types the page's fields at 16px or more, so iOS doesn't zoom in
  // on them itself, and full size shows them at that.
  await expect.poll(() => pageScale(page)).toBe(1);
  expect(
    await toDetails.evaluate(field =>
      parseFloat(getComputedStyle(field).fontSize)
    )
  ).toBeGreaterThanOrEqual(16);
  await expect(toDetails).toBeFocused();
  await expect(toDetails).toBeInViewport();

  await page.getByRole("button", { name: "Done" }).tap();

  await expect.poll(() => pageScale(page)).toBeLessThan(0.6);
  await expect(toDetails).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Done" })).toHaveCount(0);
});

test("phones get a tab bar instead of the canvas pill and panel toggles", async ({
  page
}) => {
  await page.goto("/create");
  const tabBar = page.getByRole("navigation", { name: "Editor" });
  await expect(tabBar).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Canvas" })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Show invoices panel" })
  ).toBeHidden();

  await tabBar.getByRole("button", { name: "Style" }).tap();

  // On a phone the panel is a modal sheet: it takes focus, and Escape
  // closes it.
  const inspector = page.getByRole("dialog", { name: "Inspector" });

  await expect(inspector).toBeInViewport();
  await expect(inspector).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(inspector).toHaveCount(0);
  await expect(tabBar.getByRole("button", { name: "Style" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await tabBar.getByRole("button", { name: "Invoices" }).tap();

  const library = page.getByRole("group", { name: "Library" });

  for (const name of ["Invoices", "Templates"]) {
    const button = library.getByRole("button", { name });

    await expect(button).toBeInViewport();
    await expect
      .poll(async () => (await button.boundingBox())?.height)
      .toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press("Escape");

  // The PDF that Download opens is the preview, so there's no Preview tab.
  await expect(tabBar.getByRole("button")).toHaveText([
    "Invoices",
    "Style",
    "Zoom in"
  ]);
});

test("a phone opens to editing even when Preview was left on", async ({
  page
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("editor-mode", JSON.stringify("preview"))
  );
  await page.goto("/create");

  await expect(page.getByLabel("To details")).toBeVisible();
  await expect(page.getByLabel("To details")).not.toHaveAttribute(
    "readonly",
    ""
  );
});

test("the totals' toggles are 44px tap targets at full size", async ({
  page
}) => {
  await page.goto("/create");
  await page
    .getByRole("navigation", { name: "Editor" })
    .getByRole("button", { name: "Zoom in" })
    .tap();
  await expect.poll(() => pageScale(page)).toBe(1);

  for (const name of ["Toggle discount type", "Toggle tax exempt"]) {
    const toggle = page.getByRole("button", { name });

    await expect
      .poll(async () => (await toggle.boundingBox())?.height)
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(async () => (await toggle.boundingBox())?.width)
      .toBeGreaterThanOrEqual(44);
  }

  // The total's currency button sits in its row, so its tap area is an
  // ::after reaching past it.
  const currencyTapHeight = await page
    .getByRole("button", { name: "Change currency" })
    .evaluate(button => parseFloat(getComputedStyle(button, "::after").height));

  expect(currencyTapHeight).toBeGreaterThanOrEqual(44);
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
  await expect(page.getByLabel("To details")).toBeVisible();
  await expect.poll(() => pageScale(page)).toBeLessThan(0.6);

  const cdp = await page.context().newCDPSession(page);
  const desk = page.locator("main section").first();
  const box = await desk.boundingBox();

  if (!box) throw new Error("The desk has no box");

  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
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
