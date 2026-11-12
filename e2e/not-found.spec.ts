import { APP_NAME } from "../consts/app";
import { expect, test } from "./fixtures";

test("an unknown template page is not found", async ({ page }) => {
  const response = await page.goto("/nothing-template");

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(`Page not found | ${APP_NAME}`);
});
