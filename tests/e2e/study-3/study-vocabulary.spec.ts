import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedStudyBasic, seedStudyVocabulary } from "../../helpers/seeds";

test.describe("study vocabulary", () => {
  test.beforeEach(async ({ context }) => {
    await seedStudyBasic();
    await seedStudyVocabulary();
    await addAuthCookie(context);
  });

  test("renders dedicated study dictionary", async ({ page }) => {
    await page.goto("/study-3/vocabulary");
    await expect(page.getByTestId("study-vocabulary-page")).toBeVisible();
    await expect(page.getByTestId("study-vocabulary-item-study-word-1")).toBeVisible();
    await expect(page.getByTestId("study-vocabulary-item-study-word-2")).toBeVisible();
  });

  test("opens study review mode with word on the front and translation on the back", async ({ page }) => {
    await page.goto("/study-3/vocabulary/review");
    await expect(page.getByTestId("study-vocabulary-review-page")).toBeVisible();
    await expect(page.getByTestId("study-vocabulary-review-card-study-word-1")).toBeVisible();
    await expect(page.getByText("Guten Tag")).toBeVisible();

    await page.getByRole("button", { name: "Показать перевод" }).click();
    await expect(page.getByText("Добрый день")).toBeVisible();
  });

  test("lets the user create a sound mnemonic without auto-generating it", async ({ page }) => {
    await page.goto("/study-3/vocabulary/review");
    await expect(page.getByRole("button", { name: "Включить мнемотехнику" })).toBeVisible();

    await page.getByRole("button", { name: "Включить мнемотехнику" }).click();
    await page.getByRole("button", { name: "звук" }).click();
    await page.getByPlaceholder("Например: Haus похоже на хаос").fill("хаос");
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.getByPlaceholder("Например: хаос в доме").fill("хаос в доме");
    await page.getByRole("button", { name: "Сохранить связь" }).click();
    await page.getByPlaceholder("Напишите слово").fill("Guten Tag");
    await page.getByRole("button", { name: "Проверить связь" }).click();

    await expect(page.getByText("Связь закреплена. Теперь она будет усиливать слабые повторения.")).toBeVisible();
  });

  test("deletes a vocabulary card from the dictionary", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/study-3/vocabulary");
    await expect(page.getByTestId("study-vocabulary-item-study-word-1")).toBeVisible();

    await page
      .getByTestId("study-vocabulary-item-study-word-1")
      .getByRole("button", { name: "Удалить" })
      .click();

    await expect(page.getByTestId("study-vocabulary-item-study-word-1")).toHaveCount(0);
  });

  test("deletes mnemonic from a card and allows creating a new one", async ({ page }) => {
    await page.goto("/study-3/vocabulary/review");

    await page.getByRole("button", { name: "Включить мнемотехнику" }).click();
    await page.getByRole("button", { name: "звук" }).click();
    await page.getByPlaceholder("Например: Haus похоже на хаос").fill("хаос");
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.getByPlaceholder("Например: хаос в доме").fill("хаос в доме");
    await page.getByRole("button", { name: "Сохранить связь" }).click();

    await page.getByRole("button", { name: "Удалить мнемотехнику" }).click();
    await expect(page.getByText("Мнемотехника удалена. Можно собрать новую связь.")).toBeVisible();

    await page.getByRole("button", { name: /^образ/ }).click();
    await page.getByPlaceholder("Например: бежит").fill("бежит");
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.getByPlaceholder("Например: сталкивается с дверью").fill("сталкивается с дверью");
    await page.getByRole("button", { name: "Сохранить образ" }).click();

    await expect(page.getByPlaceholder("Напишите слово")).toBeVisible();
  });
});
