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

  if (legacyTexts.length === 0) {
    return [];
  }

  await saveTexts(legacyTexts);
  return legacyTexts;
}
