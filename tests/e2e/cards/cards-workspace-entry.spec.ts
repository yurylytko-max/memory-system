import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedCardsWorkspaces } from "../../helpers/seeds";

test.describe("cards workspace entry", () => {
  test.beforeEach(async ({ context }) => {
    await seedCardsWorkspaces();
    await addAuthCookie(context);
  });

  test("shows all isolated workspaces", async ({ page }) => {
    await page.goto("/cards");
    await expect(page.getByTestId("cards-workspace-entry")).toBeVisible();
    await expect(page.getByTestId("workspace-life")).toBeVisible();
    await expect(page.getByTestId("workspace-work")).toBeVisible();
    await expect(page.getByTestId("workspace-study")).toBeVisible();
  });
});
