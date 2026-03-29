import "server-only";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { PDFDocument } from "pdf-lib";

import {
  normalizeStudyThreeBook,
  normalizeStudyThreeBooks,
  type StudyThreeBook,
} from "@/lib/study-3";

const ROOT = join(process.cwd(), ".data", "study-3");
const BOOKS_FILE = join(ROOT, "books.json");
const BOOKS_DIR = join(ROOT, "books");

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function readBooksFile() {
  try {
    const raw = await readFile(BOOKS_FILE, "utf8");
    return normalizeStudyThreeBooks(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function writeBooksFile(books: StudyThreeBook[]) {
  await ensureDir(dirname(BOOKS_FILE));
  await writeFile(BOOKS_FILE, JSON.stringify(normalizeStudyThreeBooks(books)), "utf8");
}

function getBookDir(bookId: string) {
  return join(BOOKS_DIR, bookId);
}

function getBookFilePath(bookId: string, fileName: string) {
  return join(getBookDir(bookId), fileName);
}

export async function readStudyThreeBooks() {
  return await readBooksFile();
}

export async function readStudyThreeBook(bookId: string) {
  const books = await readBooksFile();
  return books.find((book) => book.id === bookId) ?? null;
}

export async function readStudyThreeBookFile(bookId: string) {
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return null;
  }

  const filePath = getBookFilePath(book.id, book.file_name);
  return await readFile(filePath);
}

async function resolvePageCount(mimeType: string, buffer: Buffer) {
  if (mimeType === "application/pdf") {
    const document = await PDFDocument.load(buffer);
    return Math.max(1, document.getPageCount());
  }

  return 1;
}

export async function createStudyThreeBook(params: {
  title: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const books = await readBooksFile();
  const now = new Date().toISOString();
  const id = `study3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pageCount = await resolvePageCount(params.mimeType, params.buffer);
  const book = normalizeStudyThreeBook({
    id,
    title: params.title,
    file_name: params.fileName,
    mime_type: params.mimeType,
    page_count: pageCount,
    created_at: now,
    updated_at: now,
  });

  await ensureDir(getBookDir(book.id));
  await writeFile(getBookFilePath(book.id, book.file_name), params.buffer);
  await writeBooksFile([...books, book]);

  return book;
}

export async function studyThreeBookExists(bookId: string) {
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return false;
  }

  try {
    await stat(getBookFilePath(book.id, book.file_name));
    return true;
  } catch {
    return false;
  }
}
