import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedFullSmokeData } from "../../helpers/seeds";

test.describe("planner list", () => {
  test.beforeEach(async ({ context }) => {
    await seedFullSmokeData();
    await addAuthCookie(context);
  });

  test("creates a new plan", async ({ page }) => {
    await page.goto("/planner");
    await expect(page.getByTestId("planner-loaded")).toBeVisible();

    await page.getByTestId("planner-name-input").fill("Новый план");
    await page.getByTestId("planner-folder-input").fill("Тесты");
    await page.getByTestId("planner-create-button").click();

    await expect(page.getByText("Новый план")).toBeVisible();
  });
});
