import "server-only";

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { PDFDocument } from "pdf-lib";

import type { StudyBook, StudyPageDocument } from "@/lib/study";

const STUDY_ROOT = join(process.cwd(), ".data", "study");
const LIBRARY_PATH = join(STUDY_ROOT, "library.json");

function nowIso() {
  return new Date().toISOString();
}

function normalizeBook(value: unknown): StudyBook | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;

  const id = typeof item.id === "string" ? item.id.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const fileName = typeof item.file_name === "string" ? item.file_name.trim() : "";
  const mimeType = typeof item.mime_type === "string" ? item.mime_type.trim() : "";

  if (!id || !title || !fileName || !mimeType) {
    return null;
  }

  const createdAt =
    typeof item.created_at === "string" && !Number.isNaN(new Date(item.created_at).getTime())
      ? new Date(item.created_at).toISOString()
      : nowIso();
  const updatedAt =
    typeof item.updated_at === "string" && !Number.isNaN(new Date(item.updated_at).getTime())
      ? new Date(item.updated_at).toISOString()
      : createdAt;

  return {
    id,
    title,
    file_name: fileName,
    mime_type: mimeType,
    page_count: Math.max(1, Number(item.page_count) || 1),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function readLibraryFile() {
  try {
    const raw = await readFile(LIBRARY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed.map(normalizeBook).filter((item): item is StudyBook => item !== null)
      : [];

    return items.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  } catch {
    return [];
  }
}

async function writeLibraryFile(items: StudyBook[]) {
  await ensureDir(dirname(LIBRARY_PATH));
  await writeFile(LIBRARY_PATH, JSON.stringify(items, null, 2), "utf8");
}

function getBookDir(bookId: string) {
  return join(STUDY_ROOT, "books", bookId);
}

export function getBookSourcePath(book: StudyBook) {
  const extension = extname(book.file_name) || (book.mime_type === "application/pdf" ? ".pdf" : ".png");
  return join(getBookDir(book.id), `source${extension}`);
}

function getAnnotationPath(bookId: string, pageNumber: number) {
  return join(getBookDir(bookId), "pages", `${pageNumber}.json`);
}

export async function readStudyBooks() {
  return readLibraryFile();
}

export async function readStudyBook(bookId: string) {
  const books = await readLibraryFile();
  return books.find((book) => book.id === bookId) ?? null;
}

async function countPdfPages(buffer: Buffer) {
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
}

export async function createStudyBook(input: {
  title: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const bookDir = getBookDir(id);

  await ensureDir(bookDir);

  const pageCount =
    input.mimeType === "application/pdf" ? await countPdfPages(input.buffer) : 1;

  const book: StudyBook = {
    id,
    title: input.title,
    file_name: input.fileName,
    mime_type: input.mimeType,
    page_count: pageCount,
    created_at: createdAt,
    updated_at: createdAt,
  };

  await writeFile(getBookSourcePath(book), input.buffer);

  const library = await readLibraryFile();
  await writeLibraryFile([book, ...library]);

  return book;
}

export async function readStudyBookFile(book: StudyBook) {
  return readFile(getBookSourcePath(book));
}

export async function readStudyPageAnnotation(bookId: string, pageNumber: number) {
  try {
    const raw = await readFile(getAnnotationPath(bookId, pageNumber), "utf8");
    return JSON.parse(raw) as StudyPageDocument;
  } catch {
    return null;
  }
}

export async function writeStudyPageAnnotation(
  bookId: string,
  pageNumber: number,
  annotation: StudyPageDocument
) {
  const annotationPath = getAnnotationPath(bookId, pageNumber);
  await ensureDir(dirname(annotationPath));
  await writeFile(annotationPath, JSON.stringify(annotation, null, 2), "utf8");

  const library = await readLibraryFile();
  const nextLibrary = library.map((book) =>
    book.id === bookId
      ? {
          ...book,
          updated_at: nowIso(),
        }
      : book
  );
  await writeLibraryFile(nextLibrary);
}

export async function listSavedStudyPages(bookId: string) {
  const pagesDir = join(getBookDir(bookId), "pages");

  try {
    const files = await readdir(pagesDir);
    return files
      .map((file) => Number.parseInt(file.replace(/\.json$/, ""), 10))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
  } catch {
    return [];
  }
}

export async function studyBookExists(bookId: string) {
  return existsSync(getBookDir(bookId));
}

export async function getStudyBookStats(bookId: string) {
  const source = await stat(getBookDir(bookId)).catch(() => null);

  return {
    exists: Boolean(source),
    pages: await listSavedStudyPages(bookId),
  };
}
