import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedCardsWorkspaces } from "../../helpers/seeds";

test.describe("cards legacy normalization", () => {
  test.beforeEach(async ({ context }) => {
    await seedCardsWorkspaces();
    await addAuthCookie(context);
  });

  test("shows legacy cards in life workspace", async ({ page }) => {
    await page.goto("/cards/space/life");
    await expect(page.getByText("Личная заметка")).toBeVisible();
  });
});
