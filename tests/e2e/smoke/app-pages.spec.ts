import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";

test.describe("app smoke", () => {
  test.beforeEach(async ({ context }) => {
    await addAuthCookie(context);
  });

  test("home page opens", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
  });

  test("planner page opens", async ({ page }) => {
    await page.goto("/planner");
    await expect(page.getByTestId("planner-loaded")).toBeVisible();
  });

  test("cards workspace entry opens", async ({ page }) => {
    await page.goto("/cards");
    await expect(page.getByTestId("cards-workspace-entry")).toBeVisible();
  });

  test("study library opens", async ({ page }) => {
    await page.goto("/study-3");
    await expect(page.getByTestId("study-library-loaded")).toBeVisible();

    await page.goto("/study-3/vocabulary");
    await expect(page.getByTestId("study-vocabulary-page")).toBeVisible();

    await page.goto("/study-3/vocabulary/review");
    await expect(page.getByTestId("study-vocabulary-review-page")).toBeVisible();
  });

  test("texts and editor screens open", async ({ page }) => {
    await page.goto("/texts");
    await expect(page.getByTestId("texts-loaded")).toBeVisible();

    await page.goto("/editor");
    await expect(page.getByTestId("editor-home")).toBeVisible();
  });
});
