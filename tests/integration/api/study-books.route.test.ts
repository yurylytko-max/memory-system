import { beforeEach, describe, expect, test, vi } from "vitest";

const readStudyThreeBooksMock = vi.fn();
const createStudyThreeBlobBookMock = vi.fn();

vi.mock("@/lib/server/study-3-store", () => ({
  readStudyThreeBooks: readStudyThreeBooksMock,
  createStudyThreeBlobBook: createStudyThreeBlobBookMock,
}));

describe("study books route", () => {
  beforeEach(() => {
    readStudyThreeBooksMock.mockReset();
    createStudyThreeBlobBookMock.mockReset();
  });

  test("GET returns books payload", async () => {
    readStudyThreeBooksMock.mockResolvedValue([]);

    const { GET } = await import("@/app/api/study-3/books/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ books: [] });
  });

  test("POST validates missing blob metadata", async () => {
    const { POST } = await import("@/app/api/study-3/books/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Book" }),
      })
    );

    expect(response.status).toBe(400);
  });

  test("POST creates a blob-backed book from valid metadata", async () => {
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
    createStudyThreeBlobBookMock.mockResolvedValue(book);

    const { POST } = await import("@/app/api/study-3/books/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Book",
          fileName: "book.pdf",
          mimeType: "application/pdf",
          pageCount: 3,
          fileUrl: "https://example.invalid/book.pdf",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ book });
  });

  test("POST rejects non-json uploads", async () => {
    const { POST } = await import("@/app/api/study-3/books/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
      })
    );

    expect(response.status).toBe(400);
  });
});
