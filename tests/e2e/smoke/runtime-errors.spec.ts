import { expect, test } from "@playwright/test";

import { addAuthCookie } from "../../helpers/auth";
import { captureRuntimeErrors, expectNoCriticalConsoleErrors } from "../../helpers/ui";

test.describe("runtime smoke", () => {
  test.beforeEach(async ({ context }) => {
    await addAuthCookie(context);
  });

  test("key pages do not emit critical runtime errors", async ({ page }) => {
    const errors = captureRuntimeErrors(page);

    for (const route of ["/planner", "/cards", "/study-3", "/study-3/vocabulary", "/texts"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }

    await expectNoCriticalConsoleErrors(page, errors);
    expect(errors).toEqual([]);
  });
});
