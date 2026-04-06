import { beforeEach, describe, expect, test, vi } from "vitest";

const readStudyThreeBookMock = vi.fn();
const readStudyThreeBookFileMock = vi.fn();
const readStudyThreeBookHtmlPageMock = vi.fn();
const writeStudyThreeBookHtmlMock = vi.fn();
const callStudyThreeGeminiHtmlMock = vi.fn();
const extractHtmlFragmentMock = vi.fn();

vi.mock("@/lib/server/study-3-store", () => ({
  readStudyThreeBook: readStudyThreeBookMock,
  readStudyThreeBookFile: readStudyThreeBookFileMock,
  readStudyThreeBookHtmlPage: readStudyThreeBookHtmlPageMock,
  writeStudyThreeBookHtml: writeStudyThreeBookHtmlMock,
}));

vi.mock("@/lib/server/study-3-gemini", () => ({
  callStudyThreeGeminiHtml: callStudyThreeGeminiHtmlMock,
}));

vi.mock("@/lib/study-3", () => ({
  extractHtmlFragment: extractHtmlFragmentMock,
}));

describe("study book html route", () => {
  beforeEach(() => {
    readStudyThreeBookMock.mockReset();
    readStudyThreeBookFileMock.mockReset();
    readStudyThreeBookHtmlPageMock.mockReset();
    writeStudyThreeBookHtmlMock.mockReset();
    callStudyThreeGeminiHtmlMock.mockReset();
    extractHtmlFragmentMock.mockReset();
  });

  test("GET returns persisted page state", async () => {
    readStudyThreeBookMock.mockResolvedValue({
      id: "study-book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
    });
    readStudyThreeBookHtmlPageMock.mockResolvedValue({
      page_number: 1,
      status: "generated",
      html_content: "<article>Hello</article>",
    });

    const { GET } = await import("@/app/api/study-3/books/[bookId]/html/route");
    const response = await GET(
      new Request("http://localhost/api/study-3/books/study-book-1/html?pageNumber=1"),
      { params: Promise.resolve({ bookId: "study-book-1" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      page: {
        pageNumber: 1,
        status: "generated",
        htmlContent: "<article>Hello</article>",
      },
    });
  });

  test("POST does not regenerate already processed pages", async () => {
    readStudyThreeBookMock.mockResolvedValue({
      id: "study-book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
    });
    readStudyThreeBookHtmlPageMock.mockResolvedValue({
      page_number: 2,
      status: "generated",
      html_content: "<article>Saved</article>",
    });

    const { POST } = await import("@/app/api/study-3/books/[bookId]/html/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books/study-book-1/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber: 2, fileBase64: "abc", fileMimeType: "application/pdf" }),
      }),
      { params: Promise.resolve({ bookId: "study-book-1" }) }
    );

    expect(response.status).toBe(200);
    expect(callStudyThreeGeminiHtmlMock).not.toHaveBeenCalled();
    expect(writeStudyThreeBookHtmlMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      page: {
        pageNumber: 2,
        status: "generated",
        htmlContent: "<article>Saved</article>",
      },
      generated: false,
    });
  });

  test("POST generates and persists html for not_generated pages", async () => {
    readStudyThreeBookMock.mockResolvedValue({
      id: "study-book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
    });
    readStudyThreeBookHtmlPageMock.mockResolvedValue({
      page_number: 3,
      status: "not_generated",
      html_content: "",
    });
    callStudyThreeGeminiHtmlMock.mockResolvedValue("```html\n<article>Built</article>\n```");
    extractHtmlFragmentMock.mockReturnValue("<article>Built</article>");

    const { POST } = await import("@/app/api/study-3/books/[bookId]/html/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books/study-book-1/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: 3,
          fileBase64: "abc",
          fileMimeType: "application/pdf",
          bookTitle: "Book",
        }),
      }),
      { params: Promise.resolve({ bookId: "study-book-1" }) }
    );

    expect(response.status).toBe(200);
    expect(callStudyThreeGeminiHtmlMock).toHaveBeenCalledTimes(1);
    expect(writeStudyThreeBookHtmlMock).toHaveBeenCalledWith({
      bookId: "study-book-1",
      pageNumber: 3,
      html: "<article>Built</article>",
    });
    expect(await response.json()).toEqual({
      page: {
        pageNumber: 3,
        status: "generated",
        htmlContent: "<article>Built</article>",
      },
      generated: true,
    });
  });
});
