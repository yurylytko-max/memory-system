import { seedFullSmokeData } from "../helpers/seeds";

async function globalSetup() {
  await seedFullSmokeData();
}

export default globalSetup;
