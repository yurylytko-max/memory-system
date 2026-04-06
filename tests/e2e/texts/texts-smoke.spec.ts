import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedTextsBasic } from "../../helpers/seeds";

test.describe("texts smoke", () => {
  test.beforeEach(async ({ context }) => {
    await seedTextsBasic();
    await addAuthCookie(context);
  });

  test("opens texts page", async ({ page }) => {
    await page.goto("/texts");
    await expect(page.getByTestId("texts-loaded")).toBeVisible();
  });
});
