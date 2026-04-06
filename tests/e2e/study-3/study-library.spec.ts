import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { seedStudyBasic, seedStudyVocabulary } from "../../helpers/seeds";

test.describe("study library", () => {
  test.beforeEach(async ({ context }) => {
    await seedStudyBasic();
    await seedStudyVocabulary();
    await addAuthCookie(context);
  });

  test("renders uploaded books", async ({ page }) => {
    await page.goto("/study-3");
    await expect(page.getByTestId("study-library-loaded")).toBeVisible();
    await expect(page.getByTestId("study-book-link-study-book-1")).toBeVisible();
    await expect(page.getByTestId("study-book-link-study-page-1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть словарь" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Учить лексику" })).toBeVisible();
  });

  test("deletes a standalone uploaded page from the study library", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/study-3");
    await expect(page.getByTestId("study-book-card-study-page-1")).toBeVisible();

    await page.getByTestId("study-book-delete-study-page-1").click();

    await expect(page.getByTestId("study-book-card-study-page-1")).toHaveCount(0);
  });
});
