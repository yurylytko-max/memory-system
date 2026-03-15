export type TextDocument = {
  id: string;
  title: string;
  content: string;
  tag?: string;
  createdAt?: string;
  updatedAt?: string;
};

const LEGACY_TEXTS_STORAGE_KEY = "texts_db";

export async function getAllTexts(): Promise<TextDocument[]> {
  const response = await fetch("/api/texts", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load texts");
  }

  const texts = await response.json();
  return Array.isArray(texts) ? texts : [];
}

function getTimestamp(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mergeTexts(serverTexts: TextDocument[], legacyTexts: TextDocument[]) {
  if (legacyTexts.length === 0) {
    return serverTexts;
  }

  const merged = new Map<string, TextDocument>();

  for (const text of serverTexts) {
    merged.set(text.id, text);
  }

  for (const text of legacyTexts) {
    const existing = merged.get(text.id);

    if (!existing) {
      merged.set(text.id, text);
      continue;
    }

    if (getTimestamp(text.updatedAt) > getTimestamp(existing.updatedAt)) {
      merged.set(text.id, text);
    }
  }

  return Array.from(merged.values());
}

export async function getText(id: string): Promise<TextDocument | undefined> {
  const response = await fetch(`/api/texts/${id}`, { cache: "no-store" });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Failed to load text");
  }

  return await response.json();
}

export async function createText(text: TextDocument) {
  const response = await fetch("/api/texts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(text),
  });

  if (!response.ok) {
    throw new Error("Failed to create text");
  }
}

export async function updateText(text: TextDocument) {
  const response = await fetch(`/api/texts/${text.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(text),
  });

  if (!response.ok) {
    throw new Error("Failed to update text");
  }
}

export async function deleteText(id: string) {
  const response = await fetch(`/api/texts/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete text");
  }
}

export async function saveTexts(texts: TextDocument[]) {
  const response = await fetch("/api/texts", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts),
  });

  if (!response.ok) {
    throw new Error("Failed to save texts");
  }
}

export function getLegacyTexts(): TextDocument[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LEGACY_TEXTS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function migrateLegacyTextsToServer() {
  const legacyTexts = getLegacyTexts();
  const serverTexts = await getAllTexts();

  if (legacyTexts.length === 0) {
    return serverTexts;
  }

  const mergedTexts = mergeTexts(serverTexts, legacyTexts);

  if (JSON.stringify(mergedTexts) !== JSON.stringify(serverTexts)) {
    await saveTexts(mergedTexts);
  }

  return mergedTexts;
}
