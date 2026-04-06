import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedPlannerDaily } from "../../helpers/seeds";

test.describe("planner subtasks", () => {
  test.beforeEach(async ({ context }) => {
    await seedPlannerDaily();
    await addAuthCookie(context);
  });

  test("adds subtasks to a parent task", async ({ page }) => {
    await page.goto("/planner/plan-work-main");
    await expect(page.getByTestId("planner-detail-loaded")).toBeVisible();

    await page.getByText("Подготовить релиз").click();
    await page.getByRole("button", { name: "Добавить подзадачи" }).click();
    await page.getByTestId("planner-subtask-textarea").fill("Проверить changelog");
    await page.getByTestId("planner-save-subtasks-button").click();

    await expect(page.getByText("Проверить changelog")).toBeVisible();
  });
});
