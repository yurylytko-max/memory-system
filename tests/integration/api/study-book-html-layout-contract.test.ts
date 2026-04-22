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

describe("study book html layout contract", () => {
  beforeEach(() => {
    readStudyThreeBookMock.mockReset();
    readStudyThreeBookFileMock.mockReset();
    readStudyThreeBookHtmlPageMock.mockReset();
    writeStudyThreeBookHtmlMock.mockReset();
    callStudyThreeGeminiHtmlMock.mockReset();
    extractHtmlFragmentMock.mockReset();
  });

  test("GET returns layoutJson together with persisted html content", async () => {
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
      html_content: '<section class="study-dialogue"><p>Hallo!</p></section>',
      layout_json: {
        page_title: "Lektion 1",
        blocks: [
          {
            type: "dialogue",
            order: 1,
            lines: ["Hallo!"],
          },
        ],
      },
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
        htmlContent: '<section class="study-dialogue"><p>Hallo!</p></section>',
        layoutJson: {
          page_title: "Lektion 1",
          blocks: [
            {
              type: "dialogue",
              order: 1,
              lines: ["Hallo!"],
            },
          ],
        },
      },
    });
  });

  test("POST stores structured layout_json as source of truth and html as rendered artifact", async () => {
    readStudyThreeBookMock.mockResolvedValue({
      id: "study-book-1",
      title: "Book",
      file_name: "book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
    });
    readStudyThreeBookHtmlPageMock.mockResolvedValue({
      page_number: 2,
      status: "not_generated",
      html_content: "",
    });
    callStudyThreeGeminiHtmlMock.mockResolvedValue(`
{
  "page_title": "Lektion 2",
  "blocks": [
    {
      "type": "dialogue",
      "order": 1,
      "lines": ["Guten Tag!", "Wie geht's?"]
    }
  ]
}
    `.trim());
    extractHtmlFragmentMock.mockReturnValue(
      `<section class="study-dialogue"><p>Guten Tag!</p><p>Wie geht's?</p></section>`
    );

    const { POST } = await import("@/app/api/study-3/books/[bookId]/html/route");
    const response = await POST(
      new Request("http://localhost/api/study-3/books/study-book-1/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: 2,
          fileBase64: "abc",
          fileMimeType: "application/pdf",
          bookTitle: "Book",
        }),
      }),
      { params: Promise.resolve({ bookId: "study-book-1" }) }
    );

    expect(response.status).toBe(200);
    expect(writeStudyThreeBookHtmlMock).toHaveBeenCalledWith({
      bookId: "study-book-1",
      pageNumber: 2,
      html: `<section class="study-dialogue"><p>Guten Tag!</p><p>Wie geht's?</p></section>`,
      layoutJson: {
        page_title: "Lektion 2",
        blocks: [
          {
            type: "dialogue",
            order: 1,
            lines: ["Guten Tag!", "Wie geht's?"],
          },
        ],
      },
    });
    expect(await response.json()).toEqual({
      page: {
        pageNumber: 2,
        status: "generated",
        htmlContent: `<section class="study-dialogue"><p>Guten Tag!</p><p>Wie geht's?</p></section>`,
        layoutJson: {
          page_title: "Lektion 2",
          blocks: [
            {
              type: "dialogue",
              order: 1,
              lines: ["Guten Tag!", "Wie geht's?"],
            },
          ],
        },
      },
      generated: true,
    });
  });
});
