import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createCardsWorkspaceFixture } from "../fixtures/cards";
import {
  createPlannerBasicFixture,
  createPlannerDailyFixture,
} from "../fixtures/plans";
import { createStudyBooksFixture } from "../fixtures/study-3";
import { createTextsFixture } from "../fixtures/texts";
import { createStudyVocabularyFixture } from "../fixtures/vocabulary";
import { TEST_DATA_ROOT } from "./env";
import { ensureTestDataRoot, resetTestData } from "./storage";

async function writeJson(relativePath: string, value: unknown) {
  const absolutePath = join(TEST_DATA_ROOT, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify(value, null, 2), "utf8");
}

export async function seedEmptyState() {
  await resetTestData();
  await Promise.all([
    writeJson("plans-db.json", []),
    writeJson("cards-db.json", []),
    writeJson("texts-db.json", []),
    writeJson("vocabulary-db.json", []),
    writeJson("study-3/books.json", []),
  ]);
}

export async function seedPlannerBasic() {
  await ensureTestDataRoot();
  await writeJson("plans-db.json", createPlannerBasicFixture());
}

export async function seedPlannerDaily() {
  await ensureTestDataRoot();
  await writeJson("plans-db.json", createPlannerDailyFixture());
}

export async function seedCardsWorkspaces() {
  await ensureTestDataRoot();
  const cards = createCardsWorkspaceFixture();
  const [legacyCard, ...rest] = cards;

  await writeJson("cards-db.json", [
    {
      ...legacyCard,
      workspace: undefined,
    },
    ...rest,
  ]);
}

export async function seedStudyBasic() {
  await ensureTestDataRoot();
  await writeJson("study-3/books.json", createStudyBooksFixture());
  const studyRoot = join(TEST_DATA_ROOT, "study-3", "books", "study-book-1");
  await mkdir(studyRoot, { recursive: true });
  await writeFile(
    join(studyRoot, "page-1.html"),
    "<article>Hallo Welt</article>",
    "utf8"
  );
}

export async function seedStudyVocabulary() {
  await ensureTestDataRoot();
  await writeJson("vocabulary-db.json", createStudyVocabularyFixture());
}

export async function seedTextsBasic() {
  await ensureTestDataRoot();
  await writeJson("texts-db.json", createTextsFixture());
}

export async function seedFullSmokeData() {
  await seedEmptyState();
  await Promise.all([
    seedPlannerDaily(),
    seedCardsWorkspaces(),
    seedStudyBasic(),
    seedStudyVocabulary(),
    seedTextsBasic(),
  ]);
}
