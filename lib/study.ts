export type StudyInlinePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "phrase";
      text: string;
    }
  | {
      type: "blank";
      id: string;
      placeholder?: string;
      answer?: string;
    }
  | {
      type: "highlight";
      text: string;
    };

export type StudyDialogueLine = {
  speaker?: string | null;
  parts: StudyInlinePart[];
};

export type StudyDialogue = {
  id: string;
  title?: string;
  lines: StudyDialogueLine[];
  image?: {
    label?: string;
  } | null;
};

export type StudyConversation = {
  id: string;
  title?: string;
  lines: StudyDialogueLine[];
};

export type StudyPageBlock =
  | {
      type: "instruction";
      text: string;
    }
  | {
      type: "paragraph";
      parts: StudyInlinePart[];
    }
  | {
      type: "word_bank";
      items: Array<{
        text: string;
        clickable?: boolean;
        crossed_out?: boolean;
      }>;
    }
  | {
      type: "dialogue_group";
      items: StudyDialogue[];
    }
  | {
      type: "table";
      title?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: "conversation_group";
      items: StudyConversation[];
    }
  | {
      type: "image_placeholder";
      label?: string;
    }
  | {
      type: "separator";
    };

export type StudySection = {
  type: "section";
  id: string;
  title: string;
  blocks: StudyPageBlock[];
};

export type StudyPageDocument = {
  page_number: number;
  lesson_title: string;
  footer?: string;
  blocks: StudySection[];
};

export type StudyBook = {
  id: string;
  title: string;
  file_name: string;
  mime_type: string;
  page_count: number;
  created_at: string;
  updated_at: string;
};

export type StudyAssistantSelection = {
  text: string;
  translation: string;
  explanation?: string | null;
  context?: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function normalizeInlinePart(value: unknown, index: number): StudyInlinePart | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const type = asString(item.type);

  if (type === "blank") {
    return {
      type: "blank",
      id: asString(item.id) || `blank-${index}`,
      placeholder: asOptionalString(item.placeholder),
      answer: asOptionalString(item.answer),
    };
  }

  const text = asString(item.text);

  if (!text) {
    return null;
  }

  if (type === "phrase") {
    return { type: "phrase", text };
  }

  if (type === "highlight") {
    return { type: "highlight", text };
  }

  return { type: "text", text };
}

function normalizeInlineParts(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  const parts = source
    .map((item, index) => normalizeInlinePart(item, index))
    .filter((item): item is StudyInlinePart => item !== null);

  return parts.length > 0 ? parts : [{ type: "text", text: "" }];
}

function normalizeDialogueLine(value: unknown, index: number): StudyDialogueLine | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const parts = normalizeInlineParts(item.parts);
  const visibleText = parts
    .map((part) => ("text" in part ? part.text : part.placeholder ?? "_____"))
    .join("")
    .trim();

  if (!visibleText) {
    return null;
  }

  return {
    speaker: asOptionalString(item.speaker) ?? null,
    parts,
  };
}

function normalizeDialogueLines(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item, index) => normalizeDialogueLine(item, index))
    .filter((item): item is StudyDialogueLine => item !== null);
}

function normalizeDialogue(value: unknown, index: number): StudyDialogue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const lines = normalizeDialogueLines(item.lines);

  if (lines.length === 0) {
    return null;
  }

  return {
    id: asString(item.id) || `dialogue-${index}`,
    title: asOptionalString(item.title),
    lines,
    image: item.image
      ? {
          label: asOptionalString((item.image as Record<string, unknown>).label),
        }
      : null,
  };
}

function normalizeConversation(value: unknown, index: number): StudyConversation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const lines = normalizeDialogueLines(item.lines);

  if (lines.length === 0) {
    return null;
  }

  return {
    id: asString(item.id) || `conversation-${index}`,
    title: asOptionalString(item.title),
    lines,
  };
}

function normalizePageBlock(value: unknown): StudyPageBlock | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const type = asString(item.type);

  if (type === "instruction") {
    const text = asString(item.text);
    return text ? { type: "instruction", text } : null;
  }

  if (type === "paragraph") {
    return {
      type: "paragraph",
      parts: normalizeInlineParts(item.parts),
    };
  }

  if (type === "word_bank") {
    const items = Array.isArray(item.items)
      ? item.items
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const word = entry as Record<string, unknown>;
            const text = asString(word.text);

            if (!text) {
              return null;
            }

            return {
              text,
              clickable: Boolean(word.clickable),
              crossed_out: Boolean(word.crossed_out),
            };
          })
          .filter(
            (entry): entry is { text: string; clickable?: boolean; crossed_out?: boolean } =>
              entry !== null
          )
      : [];

    return items.length > 0 ? { type: "word_bank", items } : null;
  }

  if (type === "dialogue_group") {
    const items = Array.isArray(item.items)
      ? item.items
          .map((entry, index) => normalizeDialogue(entry, index))
          .filter((entry): entry is StudyDialogue => entry !== null)
      : [];

    return items.length > 0 ? { type: "dialogue_group", items } : null;
  }

  if (type === "table") {
    const headers = asStringArray(item.headers);
    const rows = Array.isArray(item.rows)
      ? item.rows.map((row) => asStringArray(row))
      : [];

    return headers.length > 0 || rows.length > 0
      ? {
          type: "table",
          title: asOptionalString(item.title),
          headers,
          rows,
        }
      : null;
  }

  if (type === "conversation_group") {
    const items = Array.isArray(item.items)
      ? item.items
          .map((entry, index) => normalizeConversation(entry, index))
          .filter((entry): entry is StudyConversation => entry !== null)
      : [];

    return items.length > 0 ? { type: "conversation_group", items } : null;
  }

  if (type === "image_placeholder") {
    return {
      type: "image_placeholder",
      label: asOptionalString(item.label),
    };
  }

  if (type === "separator") {
    return { type: "separator" };
  }

  return null;
}

function normalizeSection(value: unknown, index: number): StudySection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const title = asString(item.title);
  const sourceBlocks = Array.isArray(item.blocks) ? item.blocks : [];
  const blocks = sourceBlocks
    .map((entry) => normalizePageBlock(entry))
    .filter((entry): entry is StudyPageBlock => entry !== null);

  if (!title || blocks.length === 0) {
    return null;
  }

  return {
    type: "section",
    id: asString(item.id) || `section-${index + 1}`,
    title,
    blocks,
  };
}

export function normalizeStudyPageDocument(value: unknown, pageNumber: number): StudyPageDocument {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const blocks = Array.isArray(source.blocks)
    ? source.blocks
        .map((entry, index) => normalizeSection(entry, index))
        .filter((entry): entry is StudySection => entry !== null)
    : [];

  return {
    page_number: Math.max(1, Number(source.page_number) || pageNumber),
    lesson_title: asString(source.lesson_title) || `Страница ${pageNumber}`,
    footer: asOptionalString(source.footer),
    blocks,
  };
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

export function textFromInlineParts(parts: StudyInlinePart[]) {
  return parts
    .map((part) => {
      if (part.type === "blank") {
        return part.answer ?? part.placeholder ?? "_____";
      }

      return part.text;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
