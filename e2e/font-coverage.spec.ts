import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoEditorReady } from "./helpers";

// The PDF has no font fallback, so the editor names what the invoice's font
// can't print and offers the fonts that can (issue #227).

function fontNote(page: Page) {
  return page.getByRole("status").filter({ hasText: "can’t print" });
}

test("names the characters the font can't print and switches to one that can", async ({
  page
}) => {
  await gotoEditorReady(page);
  await page.getByLabel("To details").fill("Общество «Ромашка»\nΑθήνα");

  const note = fontNote(page);

  await expect(note).toContainText(
    "Schibsted Grotesk can’t print О б щ е с т в о"
  );
  await note.getByRole("button", { name: "Inter" }).click();

  await expect(note).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Font: Inter" })).toBeVisible();
});

test("says what no font prints", async ({ page }) => {
  await gotoEditorReady(page);
  await page.getByLabel("From details").fill("Studio 🚀");

  await expect(
    page.getByRole("status").filter({ hasText: "🚀 won’t print in any font." })
  ).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 664 },
    hasTouch: true,
    isMobile: true
  });

  test("the form says so too", async ({ page }) => {
    await page.goto("/create");
    await page
      .getByRole("textbox", { name: "To details" })
      .fill("Ελληνική Εταιρεία ΑΕ");

    await expect(fontNote(page)).toContainText("Schibsted Grotesk can’t print");
  });
});
