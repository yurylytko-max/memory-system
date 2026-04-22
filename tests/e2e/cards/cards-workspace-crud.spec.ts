import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedCardsWorkspaces } from "../../helpers/seeds";

test.describe("cards workspace crud", () => {
  test.beforeEach(async ({ context }) => {
    await seedCardsWorkspaces();
    await addAuthCookie(context);
  });

  test("creates a life card through the form", async ({ page }) => {
    await page.goto("/cards/new?workspace=life");
    await expect(page.getByTestId("new-card-page")).toBeVisible();

    await page.getByTestId("card-title-input").fill("Новая life карточка");
    await page.getByTestId("card-content-input").fill("Контент карточки");
    await page.getByTestId("card-sphere-input").fill("Тестовая сфера");
    await page.getByTestId("card-tags-input").fill("тест smoke");
    await page.getByTestId("card-save-button").click();

    await expect(page.getByTestId("card-page")).toBeVisible();
    await expect(page.getByText("Новая life карточка")).toBeVisible();
  });

  test("creates a study checklist card through the form", async ({ page }) => {
    await page.goto("/cards/new");
    await page.getByTestId("new-card-workspace-study").click();
    await expect(page.getByTestId("new-card-page")).toHaveAttribute(
      "data-workspace",
      "study"
    );

    await page.getByTestId("card-title-input").fill("Учебный план");
    await page.getByTestId("card-content-type-select").selectOption("checklist");
    await page.getByTestId("card-checklist-item-0").fill("Прочитать урок");
    await page.getByTestId("card-add-checklist-item").click();
    await page.getByTestId("card-checklist-item-1").fill("Сделать упражнения");
    await page.getByTestId("card-sphere-input").fill("Немецкий");
    await page.getByTestId("card-tags-input").fill("учёба немецкий");
    await page.getByTestId("card-save-button").click();

    await expect(page.getByTestId("card-page")).toHaveAttribute(
      "data-workspace",
      "study"
    );
    await expect(page.getByText("Учебный план")).toBeVisible();
    await expect(page.getByTestId("card-checklist")).toBeVisible();
    await expect(page.getByText("Прочитать урок")).toBeVisible();
    await expect(page.getByText("Сделать упражнения")).toBeVisible();
  });
});
