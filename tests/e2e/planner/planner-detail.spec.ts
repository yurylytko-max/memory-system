import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedPlannerDaily } from "../../helpers/seeds";

test.describe("planner detail", () => {
  test.beforeEach(async ({ context }) => {
    await seedPlannerDaily();
    await addAuthCookie(context);
  });

  test("adds a task to an existing plan", async ({ page }) => {
    await page.goto("/planner/plan-work-main");
    await expect(page.getByTestId("planner-detail-loaded")).toBeVisible();

    await page.getByTestId("planner-task-textarea").fill("Новая задача");
    await page.getByTestId("planner-add-task-button").click();

    await expect(page.getByText("Новая задача")).toBeVisible();
  });
});
