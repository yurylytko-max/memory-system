export type VocabularyItem = {
  id: string;
  text: string;
  translation: string;
  context?: string;
  source_lesson?: string;
  source_page?: number;
  correct: number;
  wrong: number;
  correct_count: number;
  wrong_count: number;
  interval: number;
  ease: number;
  next_review: string;
  created_at: string;
  updated_at: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIsoDate(value: unknown, fallback: string) {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

function createVocabularyId(index: number) {
  return `word-${Date.now()}-${index}`;
}

export function normalizeVocabularyItem(
  item: Partial<VocabularyItem>,
  index = 0
): VocabularyItem {
  const now = new Date().toISOString();
  const text = normalizeString(item.text);
  const translation = normalizeString(item.translation);

  return {
    id: normalizeString(item.id) || createVocabularyId(index),
    text,
    translation,
    context: normalizeString(item.context) || undefined,
    source_lesson: normalizeString(item.source_lesson) || undefined,
    source_page: Math.max(1, Number(item.source_page) || 0) || undefined,
    correct: Math.max(0, Number(item.correct) || 0),
    wrong: Math.max(0, Number(item.wrong) || 0),
    correct_count: Math.max(
      0,
      Number(item.correct_count ?? item.correct) || 0
    ),
    wrong_count: Math.max(0, Number(item.wrong_count ?? item.wrong) || 0),
    interval: Math.max(1, Number(item.interval) || 1),
    ease: Math.max(1.3, Number(item.ease) || 2.5),
    next_review: normalizeIsoDate(item.next_review, now),
    created_at: normalizeIsoDate(item.created_at, now),
    updated_at: normalizeIsoDate(item.updated_at, now),
  };
}

export function normalizeVocabulary(items: unknown): VocabularyItem[] {
  const source = Array.isArray(items) ? items : [];
  const seen = new Set<string>();

  return source
    .map((item, index) => normalizeVocabularyItem(item as Partial<VocabularyItem>, index))
    .filter((item) => {
      if (item.text.length === 0 || item.translation.length === 0) {
        return false;
      }

      const key = `${item.text.toLocaleLowerCase("de-DE")}::${item.translation.toLocaleLowerCase("ru-RU")}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => left.next_review.localeCompare(right.next_review));
}
