import type { BrowserContext, Page } from "@playwright/test";

import { createSiteAuthToken, SITE_AUTH_COOKIE } from "../../lib/auth";
import { TEST_BASE_URL, TEST_PASSWORD } from "./env";

export async function addAuthCookie(context: BrowserContext) {
  const token = await createSiteAuthToken(TEST_PASSWORD);

  await context.addCookies([
    {
      name: SITE_AUTH_COOKIE,
      value: token,
      url: TEST_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

export async function loginViaUi(page: Page, nextPath = "/planner") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByTestId("login-password-input").fill(TEST_PASSWORD);
  await page.getByTestId("login-submit-button").click();
}
