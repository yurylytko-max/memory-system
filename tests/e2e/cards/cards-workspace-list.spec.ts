import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedCardsWorkspaces } from "../../helpers/seeds";

test.describe("cards workspace lists", () => {
  test.beforeEach(async ({ context }) => {
    await seedCardsWorkspaces();
    await addAuthCookie(context);
  });

  test("isolates life and work cards", async ({ page }) => {
    await page.goto("/cards/space/life");
    await expect(page.getByTestId("cards-workspace-page")).toBeVisible();
    await expect(page.getByText("Личная заметка")).toBeVisible();
    await expect(page.getByText("Рабочая статья")).toHaveCount(0);

    await page.goto("/cards/space/work");
    await expect(page.getByText("Рабочая статья")).toBeVisible();
    await expect(page.getByText("Личная заметка")).toHaveCount(0);
  });
});
