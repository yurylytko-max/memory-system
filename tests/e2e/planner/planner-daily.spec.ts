import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedPlannerDaily } from "../../helpers/seeds";

test.describe("planner daily plan flow", () => {
  test.beforeEach(async ({ context }) => {
    await seedPlannerDaily();
    await addAuthCookie(context);
  });

  test("opens generated daily plan page", async ({ page }) => {
    await page.goto("/planner/daily-plan%3A2026-04-08");
    await expect(page.getByTestId("planner-detail-loaded")).toBeVisible();
    await expect(page.getByText("Подготовить релиз")).toBeVisible();
  });
});
