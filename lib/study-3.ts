export type StudyThreeBook = {
  id: string;
  title: string;
  file_name: string;
  mime_type: string;
  page_count: number;
  file_url: string;
  storage: "blob" | "local";
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

export type StudyThreeHtmlStatus = "not_generated" | "generated";

export type StudyThreeHtmlPageRecord = {
  page_number: number;
  html_content: string;
  status: StudyThreeHtmlStatus;
  layout_json?: StudyThreePageLayout;
};

export type StudyThreePageBlockType =
  | "title"
  | "heading"
  | "paragraph"
  | "dialogue"
  | "exercise"
  | "note"
  | "vocabulary"
  | "image"
  | "table"
  | "list"
  | "raw_html";

export type StudyThreePageBlock = {
  type: StudyThreePageBlockType;
  order: number;
  text?: string;
  label?: string;
  lines?: string[];
  items?: string[];
  rows?: string[][];
  caption?: string;
  html?: string;
};

export type StudyThreePageLayout = {
  page_title: string;
  blocks: StudyThreePageBlock[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item) => item.length > 0)
    : [];
}

function asTableRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((row) => asStringArray(row))
    .filter((row) => row.length > 0);
}

function normalizeStudyThreePageBlockType(value: unknown): StudyThreePageBlockType | null {
  switch (asString(value)) {
    case "title":
    case "heading":
    case "paragraph":
    case "dialogue":
    case "exercise":
    case "note":
    case "vocabulary":
    case "image":
    case "table":
    case "list":
    case "raw_html":
      return asString(value) as StudyThreePageBlockType;
    default:
      return null;
  }
}

export function normalizeStudyThreePageBlock(
  value: unknown,
  index: number
): StudyThreePageBlock | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const type = normalizeStudyThreePageBlockType(record.type);

  if (!type) {
    return null;
  }

  const block: StudyThreePageBlock = {
    type,
    order: Number.isFinite(Number(record.order)) ? Number(record.order) : index + 1,
  };

  const text = asString(record.text);
  const label = asString(record.label);
  const lines = asStringArray(record.lines);
  const items = asStringArray(record.items);
  const rows = asTableRows(record.rows);
  const caption = asString(record.caption);
  const html = typeof record.html === "string" ? record.html.trim() : "";

  if (text) {
    block.text = text;
  }

  if (label) {
    block.label = label;
  }

  if (lines.length > 0) {
    block.lines = lines;
  }

  if (items.length > 0) {
    block.items = items;
  }

  if (rows.length > 0) {
    block.rows = rows;
  }

  if (html) {
    block.html = html;
  }

  if (caption) {
    block.caption = caption;
  }

  const hasContent =
    Boolean(block.text) ||
    Boolean(block.label) ||
    (block.lines?.length ?? 0) > 0 ||
    (block.items?.length ?? 0) > 0 ||
    (block.rows?.length ?? 0) > 0 ||
    Boolean(block.caption) ||
    Boolean(block.html);

  return hasContent || type === "raw_html" ? block : null;
}

export function normalizeStudyThreePageLayout(value: unknown): StudyThreePageLayout | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  if (!record) {
    return null;
  }

  const blocks = Array.isArray(record.blocks)
    ? record.blocks
        .map((block, index) => normalizeStudyThreePageBlock(block, index))
        .filter((block): block is StudyThreePageBlock => block !== null)
        .sort((left, right) => left.order - right.order)
    : [];

  if (blocks.length === 0) {
    return null;
  }

  return {
    page_title: asString(record.page_title) || "Учебная страница",
    blocks,
  };
}

export function parseStudyThreePageLayout(raw: string) {
  const json = extractJsonObject(raw);

  if (!json) {
    return null;
  }

  try {
    return normalizeStudyThreePageLayout(JSON.parse(json));
  } catch {
    return null;
  }
}

export function createStudyThreeFallbackLayoutFromHtml(html: string, pageTitle = "Учебная страница") {
  return normalizeStudyThreePageLayout({
    page_title: pageTitle,
    blocks: [
      {
        type: "raw_html",
        order: 1,
        html,
      },
    ],
  });
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
    file_url: asString(value.file_url),
    storage: value.storage === "local" ? "local" : "blob",
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
