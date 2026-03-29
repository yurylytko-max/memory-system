import "server-only";

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { PDFDocument } from "pdf-lib";
import { createClient } from "redis";

import {
  normalizeStudyThreeBook,
  normalizeStudyThreeBooks,
  type StudyThreeBook,
} from "@/lib/study-3";

const RUNTIME_ROOT = process.env.VERCEL ? join(tmpdir(), "memory-system") : process.cwd();
const ROOT = join(RUNTIME_ROOT, ".data", "study-3");
const BOOKS_FILE = join(ROOT, "books.json");
const BOOKS_DIR = join(ROOT, "books");
const BOOKS_KEY = "study3_books_db";
const UPLOADS_DIR = join(ROOT, "uploads");

declare global {
  var __studyThreeRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

function logStudyThreeFallback(reason: string, error: unknown) {
  console.error(`Study 3 fallback (${reason}):`, error);
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL);
}

function getBookFileKey(bookId: string) {
  return `study3_book_file:${bookId}`;
}

function getUploadMetaKey(uploadId: string) {
  return `study3_upload_meta:${uploadId}`;
}

function getUploadChunksKey(uploadId: string) {
  return `study3_upload_chunks:${uploadId}`;
}

function getUploadDir(uploadId: string) {
  return join(UPLOADS_DIR, uploadId);
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
  } catch (error) {
    logStudyThreeFallback("read books from redis", error);
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
  } catch (error) {
    logStudyThreeFallback("write books to redis", error);
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

  if (book.storage === "blob" && book.file_url) {
    try {
      const response = await fetch(book.file_url, { cache: "no-store" });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      console.error("Study 3 blob fetch failed:", {
        bookId: book.id,
        status: response.status,
        fileUrl: book.file_url,
      });
    } catch (error) {
      console.error("Study 3 blob fetch error:", {
        bookId: book.id,
        fileUrl: book.file_url,
        error,
      });
    }
  }

  try {
    const client = await getClient();

    if (client) {
      const encoded = await client.get(getBookFileKey(book.id));

      if (encoded) {
        return Buffer.from(encoded, "base64");
      }
    }
  } catch (error) {
    logStudyThreeFallback("read book file from redis", error);
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

export type StudyThreeUploadSession = {
  uploadId: string;
  title: string;
  fileName: string;
  mimeType: string;
  totalChunks: number;
  createdAt: string;
};

async function writeUploadMeta(session: StudyThreeUploadSession) {
  try {
    const client = await getClient();

    if (client) {
      await client.set(getUploadMetaKey(session.uploadId), JSON.stringify(session));
      return;
    }
  } catch (error) {
    logStudyThreeFallback("write upload meta to redis", error);
    if (isServerlessRuntime()) {
      throw error instanceof Error ? error : new Error("Не удалось сохранить upload meta в Redis.");
    }
  }

  if (isServerlessRuntime()) {
    throw new Error("Upload meta требует Redis в production.");
  }

  const uploadDir = getUploadDir(session.uploadId);
  await ensureDir(uploadDir);
  await writeFile(join(uploadDir, "meta.json"), JSON.stringify(session), "utf8");
}

async function clearStudyThreeUploadSessions() {
  try {
    const client = await getClient();

    if (client) {
      const keys = await client.keys("study3_upload_*");

      if (keys.length > 0) {
        await client.del(keys);
      }
    }
  } catch (error) {
    logStudyThreeFallback("clear upload sessions in redis", error);
    // Ignore Redis cleanup issues.
  }

  try {
    await rm(UPLOADS_DIR, { recursive: true, force: true });
  } catch {
    // Ignore filesystem cleanup issues.
  }
}

async function readUploadMeta(uploadId: string): Promise<StudyThreeUploadSession | null> {
  try {
    const client = await getClient();

    if (client) {
      const raw = await client.get(getUploadMetaKey(uploadId));

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as StudyThreeUploadSession;
    }
  } catch (error) {
    logStudyThreeFallback("read upload meta from redis", error);
    if (isServerlessRuntime()) {
      throw error instanceof Error ? error : new Error("Не удалось прочитать upload meta из Redis.");
    }
  }

  if (isServerlessRuntime()) {
    return null;
  }

  try {
    const raw = await readFile(join(getUploadDir(uploadId), "meta.json"), "utf8");
    return JSON.parse(raw) as StudyThreeUploadSession;
  } catch {
    return null;
  }
}

export async function createStudyThreeUploadSession(params: {
  title: string;
  fileName: string;
  mimeType: string;
  totalChunks: number;
}) {
  await clearStudyThreeUploadSessions();

  const session: StudyThreeUploadSession = {
    uploadId: `study3-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: params.title,
    fileName: params.fileName,
    mimeType: params.mimeType,
    totalChunks: params.totalChunks,
    createdAt: new Date().toISOString(),
  };

  await writeUploadMeta(session);
  return session;
}

export async function appendStudyThreeUploadChunk(params: {
  uploadId: string;
  index: number;
  base64: string;
}) {
  try {
    const client = await getClient();

    if (client) {
      const binaryChunk = Buffer.from(params.base64, "base64").toString("latin1");
      await client.hSet(getUploadChunksKey(params.uploadId), String(params.index), binaryChunk);
      return;
    }
  } catch (error) {
    logStudyThreeFallback(`write upload chunk ${params.index} to redis`, error);
    if (isServerlessRuntime()) {
      throw error instanceof Error ? error : new Error(`Не удалось записать chunk ${params.index} в Redis.`);
    }
  }

  if (isServerlessRuntime()) {
    throw new Error(`Chunk ${params.index} требует Redis в production.`);
  }

  const uploadDir = getUploadDir(params.uploadId);
  await ensureDir(uploadDir);
  await writeFile(join(uploadDir, `chunk-${params.index}.txt`), params.base64, "utf8");
}

async function readStudyThreeUploadChunkBuffer(uploadId: string, index: number) {
  try {
    const client = await getClient();

    if (client) {
      const raw = await client.hGet(getUploadChunksKey(uploadId), String(index));

      if (!raw) {
        return null;
      }

      return Buffer.from(raw, "latin1");
    }
  } catch (error) {
    logStudyThreeFallback(`read upload chunk ${index} from redis`, error);
    if (isServerlessRuntime()) {
      throw error instanceof Error ? error : new Error(`Не удалось прочитать chunk ${index} из Redis.`);
    }
  }

  if (isServerlessRuntime()) {
    return null;
  }

  try {
    const raw = await readFile(join(getUploadDir(uploadId), `chunk-${index}.txt`), "utf8");
    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}

export async function finalizeStudyThreeUpload(uploadId: string) {
  const session = await readUploadMeta(uploadId);

  if (!session) {
    throw new Error("Сессия загрузки не найдена.");
  }

  const buffers: Buffer[] = [];

  for (let index = 0; index < session.totalChunks; index += 1) {
    const chunk = await readStudyThreeUploadChunkBuffer(uploadId, index);

    if (!chunk) {
      throw new Error("Не хватает части загруженного файла.");
    }

    buffers.push(chunk);
  }

  const book = await createStudyThreeBook({
    title: session.title,
    fileName: session.fileName,
    mimeType: session.mimeType,
    buffer: Buffer.concat(buffers),
  });

  await deleteStudyThreeUploadSession(uploadId, session.totalChunks);

  return book;
}

async function deleteStudyThreeUploadSession(uploadId: string, totalChunks: number) {
  try {
    const client = await getClient();

    if (client) {
      const keys = [getUploadMetaKey(uploadId), getUploadChunksKey(uploadId)];

      if (keys.length > 0) {
        await client.del(keys);
      }
      return;
    }
  } catch (error) {
    logStudyThreeFallback("delete upload session from redis", error);
    // Fall back to filesystem.
  }

  try {
    const uploadDir = getUploadDir(uploadId);
    const files = await readdir(uploadDir);

    await Promise.all(files.map((file) => rm(join(uploadDir, file), { force: true })));
    await rm(uploadDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures.
  }
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
    file_url: "",
    storage: "blob",
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
  } catch (error) {
    logStudyThreeFallback("write study 3 book file to redis", error);
    await ensureDir(getBookDir(book.id));
    await writeFile(getBookFilePath(book.id, book.file_name), params.buffer);
  }

  await writeBooksFile([...books, book]);

  return book;
}

export async function createStudyThreeBlobBook(params: {
  title: string;
  fileName: string;
  mimeType: string;
  pageCount: number;
  fileUrl: string;
}) {
  const books = await readBooksFile();
  const now = new Date().toISOString();
  const book = normalizeStudyThreeBook({
    id: `study3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: params.title,
    file_name: params.fileName,
    mime_type: params.mimeType,
    page_count: Math.max(1, params.pageCount),
    file_url: params.fileUrl,
    storage: "blob",
    created_at: now,
    updated_at: now,
  });

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
  } catch (error) {
    logStudyThreeFallback("check study 3 book in redis", error);
    // Fall through to filesystem fallback.
  }

  try {
    await stat(getBookFilePath(book.id, book.file_name));
    return true;
  } catch {
    return false;
  }
}
