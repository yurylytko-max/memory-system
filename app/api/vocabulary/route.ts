import { NextResponse } from "next/server";

import {
  buildVocabularyKey,
  buildVocabularyReviewQueue,
  filterStudyThreeVocabulary,
  normalizeVocabularyItem,
  validateVocabularyMnemonic,
  type VocabularyMnemonic,
  type VocabularyMnemonicMode,
  type VocabularyMnemonicStatus,
} from "@/lib/vocabulary";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

function sortByReview(items: Awaited<ReturnType<typeof readVocabulary>>) {
  return [...items].sort((left, right) => left.next_review.localeCompare(right.next_review));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const items = sortByReview(await readVocabulary());
  const filteredItems = source === "study-3" ? filterStudyThreeVocabulary(items) : items;
  const queue = source === "study-3" ? buildVocabularyReviewQueue(filteredItems) : null;
  const now = queue?.now ?? new Date().toISOString();
  const due = queue?.dueItems ?? filteredItems.filter((item) => item.next_review <= now);

  return NextResponse.json({
    items: filteredItems,
    due,
    now,
    queue,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | {
        items?: Array<{
          text?: string;
          translation?: string;
          context?: string;
          source_lesson?: string;
          source_page?: number;
          source_type?: "study-3";
          source_book_id?: string;
          source_book_title?: string;
          collection?: "study-3-dictionary";
          mnemonic_status?: VocabularyMnemonicStatus;
          mnemonic_mode?: VocabularyMnemonicMode;
          mnemonic?: VocabularyMnemonic;
        }>;
      }
    | {
        text?: string;
        translation?: string;
        context?: string;
        source_lesson?: string;
        source_page?: number;
        source_type?: "study-3";
        source_book_id?: string;
        source_book_title?: string;
        collection?: "study-3-dictionary";
        mnemonic_status?: VocabularyMnemonicStatus;
        mnemonic_mode?: VocabularyMnemonicMode;
        mnemonic?: VocabularyMnemonic;
      };
  const incomingItems = Array.isArray((body as { items?: unknown[] }).items)
    ? (
        body as {
          items: Array<{
            text?: string;
            translation?: string;
            context?: string;
            source_lesson?: string;
            source_page?: number;
            source_type?: "study-3";
            source_book_id?: string;
            source_book_title?: string;
            collection?: "study-3-dictionary";
            mnemonic_status?: VocabularyMnemonicStatus;
            mnemonic_mode?: VocabularyMnemonicMode;
            mnemonic?: VocabularyMnemonic;
          }>;
        }
      ).items
    : [
        body as {
          text?: string;
          translation?: string;
          context?: string;
          source_lesson?: string;
          source_page?: number;
          source_type?: "study-3";
          source_book_id?: string;
          source_book_title?: string;
          collection?: "study-3-dictionary";
          mnemonic_status?: VocabularyMnemonicStatus;
          mnemonic_mode?: VocabularyMnemonicMode;
          mnemonic?: VocabularyMnemonic;
        },
      ];
  const existing = await readVocabulary();
  const nextItems = [...existing];
  const existingKeys = new Set(existing.map((item) => buildVocabularyKey(item)));
  let validationError = "";

  incomingItems.forEach((item, index) => {
    if (validationError) {
      return;
    }

    const normalized = normalizeVocabularyItem(item, existing.length + index);
    const key = buildVocabularyKey(normalized);
    const nextValidationError = validateVocabularyMnemonic(normalized, [...nextItems, normalized]);

    if (nextValidationError) {
      validationError = nextValidationError;
      return;
    }

    if (!key || existingKeys.has(key)) {
      return;
    }

    existingKeys.add(key);
    nextItems.push(normalized);
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await writeVocabulary(nextItems);

  return NextResponse.json({
    success: true,
    items: sortByReview(nextItems),
    queue: buildVocabularyReviewQueue(nextItems),
  });
}
