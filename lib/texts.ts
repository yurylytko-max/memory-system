export type TextDocument = {
  id: string;
  title: string;
  content: string;
  tag?: string;
  createdAt?: string;
  updatedAt?: string;
};

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
