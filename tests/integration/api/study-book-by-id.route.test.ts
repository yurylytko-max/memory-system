import { beforeEach, describe, expect, test, vi } from "vitest";

const readStudyThreeBookMock = vi.fn();
const deleteStudyThreeBookMock = vi.fn();

vi.mock("@/lib/server/study-3-store", () => ({
  readStudyThreeBook: readStudyThreeBookMock,
  deleteStudyThreeBook: deleteStudyThreeBookMock,
}));

describe("study book by id route", () => {
  beforeEach(() => {
    readStudyThreeBookMock.mockReset();
    deleteStudyThreeBookMock.mockReset();
  });

  test("returns 404 for missing book", async () => {
    readStudyThreeBookMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/study-3/books/[bookId]/route");
    const response = await GET(new Request("http://localhost/api/study-3/books/missing"), {
      params: Promise.resolve({ bookId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  test("returns a book payload for an existing book", async () => {
    const book = {
      id: "study-book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      file_url: "https://example.invalid/book.pdf",
      storage: "blob",
      created_at: "2026-04-05T12:00:00.000Z",
      updated_at: "2026-04-05T12:00:00.000Z",
    };
    readStudyThreeBookMock.mockResolvedValue(book);

    const { GET } = await import("@/app/api/study-3/books/[bookId]/route");
    const response = await GET(new Request("http://localhost/api/study-3/books/study-book-1"), {
      params: Promise.resolve({ bookId: "study-book-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ book });
  });

  test("DELETE removes a study book or standalone page entry", async () => {
    const book = {
      id: "study-page-1",
      title: "Standalone Page",
      file_name: "page-1.png",
      mime_type: "image/png",
      page_count: 1,
      file_url: "https://example.invalid/page-1.png",
      storage: "blob",
      created_at: "2026-04-05T12:30:00.000Z",
      updated_at: "2026-04-05T12:30:00.000Z",
    };
    deleteStudyThreeBookMock.mockResolvedValue(book);

    const { DELETE } = await import("@/app/api/study-3/books/[bookId]/route");
    const response = await DELETE(new Request("http://localhost/api/study-3/books/study-page-1"), {
      params: Promise.resolve({ bookId: "study-page-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, book });
  });

  test("DELETE returns 404 when book is missing", async () => {
    deleteStudyThreeBookMock.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/study-3/books/[bookId]/route");
    const response = await DELETE(new Request("http://localhost/api/study-3/books/missing"), {
      params: Promise.resolve({ bookId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
