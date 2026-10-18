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

  await expect.poll(() => pageScale(page)).toBe(1);
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

// Mean difference per channel (0 to 255) between two screenshots of the same
// size, worked out in the page's own canvas.
async function imageDifference(page: Page, first: Buffer, second: Buffer) {
  return await page.evaluate(
    async ([a, b]) => {
      const load = async (base64: string) =>
        await createImageBitmap(
          await (await fetch(`data:image/png;base64,${base64}`)).blob()
        );
      const [imageA, imageB] = await Promise.all([load(a), load(b)]);
      const canvas = new OffscreenCanvas(imageA.width, imageA.height);
      const context = canvas.getContext("2d");

      if (!context) return 255;

      context.drawImage(imageA, 0, 0);
      const pixelsA = context.getImageData(0, 0, imageA.width, imageA.height);

      context.clearRect(0, 0, imageA.width, imageA.height);
      context.drawImage(imageB, 0, 0);
      const pixelsB = context.getImageData(0, 0, imageA.width, imageA.height);
      let total = 0;

      for (let i = 0; i < pixelsA.data.length; i++) {
        total += Math.abs(pixelsA.data[i] - pixelsB.data[i]);
      }

      return total / pixelsA.data.length;
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

  // What the pinch showed is what it settled on: drawn at the same zoom in
  // the same place, not a stretched, blurry copy of the smaller page.
  const difference = await imageDifference(page, duringPinch, afterPinch);
  expect(difference).toBeLessThan(1);
  await expect(desk).toHaveCSS("overflow", "auto");
});
