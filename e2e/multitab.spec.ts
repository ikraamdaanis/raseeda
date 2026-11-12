import { APP_NAME } from "../consts/app";
import { expect, test } from "./fixtures";
import { gotoEditorReady, savedContains } from "./helpers";

// Two pages in one browser context share IndexedDB and Web Locks, as two tabs
// do. One tab has the editor at a time; any other on /create says so and
// offers Use here.

const OPEN_ELSEWHERE = `${APP_NAME} is open in another tab`;

test("a second tab shows the notice and no editor", async ({ page }) => {
  await gotoEditorReady(page, "Shared title");

  const second = await page.context().newPage();

  await second.goto("/create");

  await expect(
    second.getByRole("heading", { name: OPEN_ELSEWHERE })
  ).toBeVisible();
  await expect(second.getByRole("button", { name: "Use here" })).toBeVisible();
  await expect(second.getByLabel("Invoice title")).toHaveCount(0);
  await expect(page.getByLabel("Invoice title")).toHaveValue("Shared title");
});

test("Use here hands over with the first tab's pending edit written", async ({
  page
}) => {
  await gotoEditorReady(page, "Shared title");

  const second = await page.context().newPage();

  await second.goto("/create");
  await expect(second.getByRole("button", { name: "Use here" })).toBeVisible();

  // No waiting for the write: it's still inside the save delay.
  await page.getByLabel("From details").fill("Pending in the first tab");
  await second.getByRole("button", { name: "Use here" }).click();

  await expect(second.getByLabel("From details")).toHaveValue(
    "Pending in the first tab"
  );
  await expect(
    page.getByRole("heading", { name: OPEN_ELSEWHERE })
  ).toBeVisible();
  await expect(page.getByLabel("Invoice title")).toHaveCount(0);

  await second.getByLabel("Invoice title").fill("Now the second tab's");
  await expect
    .poll(() => savedContains(second, "Now the second tab's"))
    .toBe(true);

  await page.getByRole("button", { name: "Use here" }).click();

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Now the second tab's"
  );
  await expect(
    second.getByRole("heading", { name: OPEN_ELSEWHERE })
  ).toBeVisible();
});

test("closing the editor tab hands the editor to the waiting one", async ({
  page
}) => {
  await gotoEditorReady(page, "Handed on");

  const second = await page.context().newPage();

  await second.goto("/create");
  await expect(second.getByRole("button", { name: "Use here" })).toBeVisible();

  await page.close();

  await expect(second.getByLabel("Invoice title")).toHaveValue("Handed on");
});

test("a tab that hands over while its writes fail keeps its edits and offers Export", async ({
  page
}) => {
  // The page's IndexedDB refuses writes to invoices while the disk is "full".
  await page.addInitScript(() => {
    const storage = { full: false };

    Object.assign(window, { storage });

    for (const method of ["put", "add"] as const) {
      const original = IDBObjectStore.prototype[method];

      IDBObjectStore.prototype[method] = function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore["put"]>
      ) {
        if (storage.full && this.name === "invoices") {
          throw new DOMException(
            "The quota has been exceeded.",
            "QuotaExceededError"
          );
        }

        return original.apply(this, args);
      };
    }
  });

  await gotoEditorReady(page, "Before the disk filled");
  await page.evaluate(() =>
    Object.assign((window as unknown as { storage: object }).storage, {
      full: true
    })
  );
  await page.getByLabel("From details").fill("Written while full");
  await expect(page.getByRole("alert")).toContainText("storage is full");

  const second = await page.context().newPage();

  await second.goto("/create");
  await second.getByRole("button", { name: "Use here" }).click();

  await expect(second.getByLabel("Invoice title")).toHaveValue(
    "Before the disk filled"
  );
  await expect(
    page.getByRole("heading", { name: OPEN_ELSEWHERE })
  ).toBeVisible();

  const alert = page.getByRole("alert");

  await expect(alert).toContainText("storage is full");

  const downloadPromise = page.waitForEvent("download");

  await alert.getByRole("button", { name: "Export" }).click();

  const download = await downloadPromise;
  const chunks: Buffer[] = [];

  for await (const chunk of await download.createReadStream()) {
    chunks.push(chunk as Buffer);
  }

  expect(Buffer.concat(chunks).toString("utf8")).toContain(
    "Written while full"
  );
});
