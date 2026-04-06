import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedCardsWorkspaces } from "../../helpers/seeds";

test.describe("cards spheres and tags", () => {
  test.beforeEach(async ({ context }) => {
    await seedCardsWorkspaces();
    await addAuthCookie(context);
  });

  test("shows workspace-specific spheres", async ({ page }) => {
    await page.goto("/cards/space/work");
    await expect(page.getByTestId("sphere-folder-Инженерия")).toBeVisible();
    await expect(page.getByTestId("sphere-folder-Здоровье")).toHaveCount(0);
  });
});
