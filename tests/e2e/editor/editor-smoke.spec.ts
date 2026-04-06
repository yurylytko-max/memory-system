import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";

test.describe("editor smoke", () => {
  test.beforeEach(async ({ context }) => {
    await addAuthCookie(context);
  });

  test("opens editor home", async ({ page }) => {
    await page.goto("/editor");
    await expect(page.getByTestId("editor-home")).toBeVisible();
  });
});
