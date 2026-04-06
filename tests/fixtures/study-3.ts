import type { StudyThreeBook } from "@/lib/study-3";

export function createStudyBooksFixture(): StudyThreeBook[] {
  return [
    {
      id: "study-book-1",
      title: "Test German Book",
      file_name: "german-book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      file_url: "https://example.invalid/german-book.pdf",
      storage: "blob",
      created_at: "2026-04-05T12:00:00.000Z",
      updated_at: "2026-04-05T12:00:00.000Z",
    },
    {
      id: "study-page-1",
      title: "Standalone Page",
      file_name: "page-1.png",
      mime_type: "image/png",
      page_count: 1,
      file_url: "https://example.invalid/page-1.png",
      storage: "blob",
      created_at: "2026-04-05T12:30:00.000Z",
      updated_at: "2026-04-05T12:30:00.000Z",
    },
  ];
}
