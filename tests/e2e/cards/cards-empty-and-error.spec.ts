import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedEmptyState } from "../../helpers/seeds";

test.describe("cards empty states", () => {
  test.beforeEach(async ({ context }) => {
    await seedEmptyState();
    await addAuthCookie(context);
  });

  test("renders an empty workspace without crashing", async ({ page }) => {
    await page.goto("/cards/space/life");
    await expect(page.getByTestId("cards-workspace-page")).toBeVisible();
    await expect(page.getByText("По текущим фильтрам подходящих сфер нет.")).toBeVisible();
  });
});
