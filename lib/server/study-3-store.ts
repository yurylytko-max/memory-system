import "server-only";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { PDFDocument } from "pdf-lib";
import { createClient } from "redis";

import {
  normalizeStudyThreeBook,
  normalizeStudyThreeBooks,
  type StudyThreeBook,
} from "@/lib/study-3";

const ROOT = join(process.cwd(), ".data", "study-3");
const BOOKS_FILE = join(ROOT, "books.json");
const BOOKS_DIR = join(ROOT, "books");
const BOOKS_KEY = "study3_books_db";

declare global {
  var __studyThreeRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

function getBookFileKey(bookId: string) {
  return `study3_book_file:${bookId}`;
}

async function readFallbackBooksFile() {
  try {
    const raw = await readFile(BOOKS_FILE, "utf8");
    const books = normalizeStudyThreeBooks(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(books);

    if (raw !== normalizedRaw) {
      await ensureDir(dirname(BOOKS_FILE));
      await writeFile(BOOKS_FILE, normalizedRaw, "utf8");
    }

    return books;
  } catch {
    return [];
  }
}

async function writeFallbackBooksFile(books: StudyThreeBook[]) {
  await ensureDir(dirname(BOOKS_FILE));
  await writeFile(BOOKS_FILE, JSON.stringify(normalizeStudyThreeBooks(books)), "utf8");
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__studyThreeRedisClient) {
    global.__studyThreeRedisClient = createClient({ url });
    global.__studyThreeRedisClient.on("error", (error) => {
      console.error("Study 3 Redis client error:", error);
    });
  }

  if (!global.__studyThreeRedisClient.isOpen) {
    await global.__studyThreeRedisClient.connect();
  }

  return global.__studyThreeRedisClient;
}

async function readBooksFile() {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackBooksFile();
    }

    const raw = await client.get(BOOKS_KEY);

    if (!raw) {
      return [];
    }

    const books = normalizeStudyThreeBooks(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(books);

    if (raw !== normalizedRaw) {
      await client.set(BOOKS_KEY, normalizedRaw);
    }

    return books;
  } catch {
    return await readFallbackBooksFile();
  }
}

async function writeBooksFile(books: StudyThreeBook[]) {
  try {
    const client = await getClient();
    const normalized = normalizeStudyThreeBooks(books);

    if (!client) {
      await writeFallbackBooksFile(normalized);
      return;
    }

    await client.set(BOOKS_KEY, JSON.stringify(normalized));
  } catch {
    await writeFallbackBooksFile(books);
  }
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

  try {
    const client = await getClient();

    if (client) {
      const encoded = await client.get(getBookFileKey(book.id));

      if (encoded) {
        return Buffer.from(encoded, "base64");
      }
    }
  } catch {
    // Fall through to filesystem fallback.
  }

  try {
    const filePath = getBookFilePath(book.id, book.file_name);
    return await readFile(filePath);
  } catch {
    return null;
  }
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

  try {
    const client = await getClient();

    if (client) {
      await client.set(getBookFileKey(book.id), params.buffer.toString("base64"));
    } else {
      await ensureDir(getBookDir(book.id));
      await writeFile(getBookFilePath(book.id, book.file_name), params.buffer);
    }
  } catch {
    await ensureDir(getBookDir(book.id));
    await writeFile(getBookFilePath(book.id, book.file_name), params.buffer);
  }

  await writeBooksFile([...books, book]);

  return book;
}

export async function studyThreeBookExists(bookId: string) {
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return false;
  }

  try {
    const client = await getClient();

    if (client) {
      return (await client.exists(getBookFileKey(book.id))) > 0;
    }
  } catch {
    // Fall through to filesystem fallback.
  }

  try {
    await stat(getBookFilePath(book.id, book.file_name));
    return true;
  } catch {
    return false;
  }
}
