import { describe, expect, test } from "vitest";

import {
  clampSelectionText,
  extractHtmlFragment,
  extractJsonObject,
  normalizeStudyThreeBook,
  normalizeStudyThreeBooks,
} from "@/lib/study-3";

describe("study helpers", () => {
  test("normalizes a single study book", () => {
    const book = normalizeStudyThreeBook({
      id: "book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      file_url: "https://example.invalid/book.pdf",
    });

    expect(book.id).toBe("book-1");
    expect(book.page_count).toBe(3);
    expect(book.storage).toBe("blob");
  });

  test("normalizes study book arrays", () => {
    const books = normalizeStudyThreeBooks([
      {
        id: "book-1",
        title: "Book",
        file_name: "book.pdf",
        mime_type: "application/pdf",
        page_count: 3,
        file_url: "https://example.invalid/book.pdf",
      },
    ]);

    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Book");
  });

  test("extracts json objects from fenced text", () => {
    const result = extractJsonObject("```json\n{\"a\":1}\n```");
    expect(result).toBe("{\"a\":1}");
  });

  test("extracts html fragments from fenced text", () => {
    const result = extractHtmlFragment("```html\n<div>Hello</div>\n```");
    expect(result).toBe("<div>Hello</div>");
  });

  test("clamps selection text", () => {
    expect(clampSelectionText("  hello   world  ")).toBe("hello world");
  });
});
