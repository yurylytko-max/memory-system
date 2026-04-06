import { beforeEach } from "vitest";

import { resetTestData } from "../helpers/storage";

beforeEach(async () => {
  await resetTestData();
});
