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

  test("records completed tasks on the completed page", async ({ page }) => {
    await page.goto("/planner/plan-work-main");
    await expect(page.getByTestId("planner-detail-loaded")).toBeVisible();

    const completedTaskResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/planner/completed-tasks") &&
        response.request().method() === "POST"
    );

    await page
      .getByTestId("planner-task-item")
      .filter({ hasText: "Подготовить релиз" })
      .getByTestId("planner-task-toggle")
      .first()
      .click();
    await expect(await completedTaskResponse).toBeOK();

    await page.goto("/planner/completed");
    await expect(page.getByTestId("planner-completed-loaded")).toBeVisible();
    await expect(page.getByTestId("planner-completed-count")).toHaveText("1");
    await expect(page.getByTestId("planner-completed-task")).toContainText(
      "Подготовить релиз"
    );

    await page.goto("/planner/plan-work-main");
    await page
      .getByTestId("planner-task-item")
      .filter({ hasText: "Подготовить релиз" })
      .getByTestId("planner-task-toggle")
      .first()
      .click();

    await page.goto("/planner/completed");
    await expect(page.getByTestId("planner-completed-count")).toHaveText("1");
  });

  test("collects already completed tasks from plans", async ({ page }) => {
    await page.goto("/planner/plan-work-main");
    await expect(page.getByTestId("planner-detail-loaded")).toBeVisible();

    await page
      .getByTestId("planner-task-item")
      .filter({ hasText: "Подготовить релиз" })
      .getByTestId("planner-task-toggle")
      .first()
      .click();

    await page.goto("/planner/completed");
    await expect(page.getByTestId("planner-completed-loaded")).toBeVisible();

    const collectResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/planner/completed-tasks/collect") &&
        response.request().method() === "POST"
    );
    await page.getByTestId("planner-collect-completed-button").click();

    await expect(await collectResponse).toBeOK();
    await expect(page.getByTestId("planner-collect-completed-status")).toContainText(
      "Новых выполненных задач нет."
    );
    await expect(page.getByTestId("planner-completed-count")).toHaveText("1");
  });
});
