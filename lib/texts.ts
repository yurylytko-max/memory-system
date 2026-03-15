export type TextDocument = {
  id: string;
  title: string;
  content: string;
  tag?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STORAGE_KEY = "texts_db";

function readRaw(): TextDocument[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(texts: TextDocument[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(texts));
}

export function getAllTexts(): TextDocument[] {
  return readRaw();
}

export function getText(id: string): TextDocument | undefined {
  return readRaw().find((text) => text.id === id);
}

export function createText(text: TextDocument) {
  writeRaw([...readRaw(), text]);
}

export function updateText(text: TextDocument) {
  const texts = readRaw();
  const index = texts.findIndex((item) => item.id === text.id);

  if (index === -1) {
    writeRaw([...texts, text]);
    return;
  }

  const updated = [...texts];
  updated[index] = text;
  writeRaw(updated);
}

export function deleteText(id: string) {
  writeRaw(readRaw().filter((text) => text.id !== id));
}
