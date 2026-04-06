import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function gotoAndWaitForApp(page: Page, path: string, marker: string) {
  await page.goto(path);
  await expect(page.getByTestId(marker)).toBeVisible();
}

export async function waitForPlannerLoaded(page: Page) {
  await expect(page.getByTestId("planner-loaded")).toBeVisible();
}

export async function waitForCardsLoaded(page: Page) {
  await expect(page.getByTestId("cards-workspace-page")).toBeVisible();
}

export async function waitForStudyLibraryLoaded(page: Page) {
  await expect(page.getByTestId("study-library-loaded")).toBeVisible();
}

export function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

export async function expectNoCriticalConsoleErrors(page: Page, errors: string[]) {
  await expect
    .poll(() => errors.filter((entry) => !entry.includes("favicon.ico")))
    .toEqual([]);
}
