import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  createStudyThreeBook,
  readStudyThreeBookHtmlPage,
  writeStudyThreeBookHtml,
} from "@/lib/server/study-3-store";
import { TEST_DATA_ROOT } from "../../helpers/env";

describe("study store layout contract", () => {
  test("readStudyThreeBookHtmlPage returns persistent layout_json together with html_content", async () => {
    const book = await createStudyThreeBook({
      title: "Layout Book",
      fileName: "page.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image"),
    });

    await writeStudyThreeBookHtml({
      bookId: book.id,
      pageNumber: 1,
      html: '<section class="study-note"><p>Merken Sie sich das.</p></section>',
    });

    const page = await readStudyThreeBookHtmlPage(book.id, 1);

    expect(page).toMatchObject({
      page_number: 1,
      status: "generated",
      html_content: '<section class="study-note"><p>Merken Sie sich das.</p></section>',
      layout_json: {
        page_title: expect.any(String),
        blocks: expect.any(Array),
      },
    });
  });

  test("persistent html-pages storage keeps layout_json as source of truth", async () => {
    const book = await createStudyThreeBook({
      title: "Layout Storage Book",
      fileName: "page.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image"),
    });

    await writeStudyThreeBookHtml({
      bookId: book.id,
      pageNumber: 1,
      html: '<section class="study-vocabulary"><ul><li>gehen</li></ul></section>',
    });

    const raw = await readFile(
      join(TEST_DATA_ROOT, "study-3", "books", book.id, "html-pages.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(parsed["1"]).toEqual({
      page_number: 1,
      status: "generated",
      html_content: '<section class="study-vocabulary"><ul><li>gehen</li></ul></section>',
      layout_json: {
        page_title: expect.any(String),
        blocks: expect.any(Array),
      },
    });
  });
});
