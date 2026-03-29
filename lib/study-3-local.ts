"use client";

import { normalizeStudyThreeBook, type StudyThreeBook } from "@/lib/study-3";

const STORAGE_KEY = "study-3-local-books";
const DB_NAME = "memory-system-study-3";
const STORE_NAME = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть IndexedDB."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDb();

  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = run(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Не удалось выполнить операцию IndexedDB."));

    transaction.oncomplete = () => database.close();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Ошибка транзакции IndexedDB."));
  });
}

function readLocalBooks(): StudyThreeBook[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalBooks(books: StudyThreeBook[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

export function isLocalStudyThreeBookId(bookId: string) {
  return bookId.startsWith("local-study3-");
}

export function listLocalStudyThreeBooks() {
  return readLocalBooks().map((book, index) => normalizeStudyThreeBook(book, index));
}

export function readLocalStudyThreeBook(bookId: string) {
  return listLocalStudyThreeBooks().find((book) => book.id === bookId) ?? null;
}

export async function readLocalStudyThreeFile(bookId: string) {
  const result = await withStore<Blob | undefined>("readonly", (store) => store.get(bookId));
  return result ?? null;
}

export async function saveLocalStudyThreeBook(params: {
  title: string;
  file: File;
  pageCount: number;
}) {
  const now = new Date().toISOString();
  const book = normalizeStudyThreeBook({
    id: `local-study3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: params.title,
    file_name: params.file.name,
    mime_type: params.file.type || "application/octet-stream",
    page_count: Math.max(1, params.pageCount),
    file_url: "",
    storage: "local",
    created_at: now,
    updated_at: now,
  });

  await withStore("readwrite", (store) => store.put(params.file, book.id));

  const books = listLocalStudyThreeBooks();
  const nextBooks = [book, ...books.filter((entry) => entry.id !== book.id)];
  writeLocalBooks(nextBooks);

  return book;
}
