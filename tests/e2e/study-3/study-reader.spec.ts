import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedStudyBasic, seedStudyVocabulary } from "../../helpers/seeds";

test.describe("study reader", () => {
  test.beforeEach(async ({ context }) => {
    await seedStudyBasic();
    await seedStudyVocabulary();
    await addAuthCookie(context);
  });

  test("opens a reader page without crashing", async ({ page }) => {
    await page.goto("/study-3/study-book-1");
    await expect(page.getByTestId("study-reader-loaded")).toBeVisible();
    await expect(page.getByTestId("study-reader-content")).toBeVisible();
    await expect(page.getByTestId("study-reader-assistant")).toBeVisible();
    await expect(page.getByRole("button", { name: "Получить HTML" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Показать HTML" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть словарь" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Учить лексику" })).toBeVisible();
  });

  test("keeps html/page area and assistant in two balanced columns on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/study-3/study-book-1");

    const contentBox = await page.getByTestId("study-reader-content").boundingBox();
    const assistantBox = await page.getByTestId("study-reader-assistant").boundingBox();

    expect(contentBox).not.toBeNull();
    expect(assistantBox).not.toBeNull();

    const widthDelta = Math.abs((contentBox?.width ?? 0) - (assistantBox?.width ?? 0));
    expect(widthDelta).toBeLessThan(80);
  });
});
