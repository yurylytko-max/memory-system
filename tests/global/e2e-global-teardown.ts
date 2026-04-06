import { resetTestData } from "../helpers/storage";

async function globalTeardown() {
  await resetTestData();
}

export default globalTeardown;
