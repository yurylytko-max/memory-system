import { expect, test } from "@playwright/test";

import { TEST_PASSWORD } from "../../helpers/env";

test.describe("login flow", () => {
  test("redirects unauthenticated users to login and returns after success", async ({
    page,
  }) => {
    await page.goto("/planner", { waitUntil: "commit" }).catch(() => {});
    await expect(page).toHaveURL(/\/login\?next=%2Fplanner/);
    await expect(page.getByTestId("login-page")).toBeVisible();

    await page.getByTestId("login-password-input").fill(TEST_PASSWORD);
    await page.getByTestId("login-submit-button").click();

    await expect(page).toHaveURL(/\/planner$/);
    await expect(page.getByTestId("planner-loaded")).toBeVisible();
  });

  test("shows an error for invalid password", async ({ page }) => {
    await page.goto("/login?next=/planner");
    await page.getByTestId("login-password-input").fill("wrong-password");
    await page.getByTestId("login-submit-button").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
