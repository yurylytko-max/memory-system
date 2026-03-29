export type StudyThreeBook = {
  id: string;
  title: string;
  file_name: string;
  mime_type: string;
  page_count: number;
  created_at: string;
  updated_at: string;
};

export type StudyThreeAssistantSelection = {
  text: string;
  context?: string;
  pageTitle?: string;
  bookTitle?: string;
};

export type StudyThreeHtmlPage = {
  html: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeStudyThreeBook(
  value: Partial<StudyThreeBook>,
  index = 0
): StudyThreeBook {
  const now = new Date().toISOString();

  return {
    id:
      typeof value.id === "string" && value.id.trim().length > 0
        ? value.id.trim()
        : `study-3-${index}-${Date.now()}`,
    title: asString(value.title) || "Учебник",
    file_name: asString(value.file_name) || "file",
    mime_type: asString(value.mime_type) || "application/octet-stream",
    page_count: Math.max(1, Number(value.page_count) || 1),
    created_at: asString(value.created_at) || now,
    updated_at: asString(value.updated_at) || now,
  };
}

export function normalizeStudyThreeBooks(value: unknown): StudyThreeBook[] {
  return Array.isArray(value)
    ? value.map((entry, index) =>
        normalizeStudyThreeBook((entry ?? {}) as Partial<StudyThreeBook>, index)
      )
    : [];
}

export function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    return null;
  }

  return candidate.slice(first, last + 1);
}

export function clampSelectionText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function extractHtmlFragment(raw: string) {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const firstTag = candidate.indexOf("<");
  const lastTag = candidate.lastIndexOf(">");

  if (firstTag === -1 || lastTag === -1 || lastTag <= firstTag) {
    return "";
  }

  return candidate.slice(firstTag, lastTag + 1).trim();
}
