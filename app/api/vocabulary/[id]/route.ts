import { NextResponse } from "next/server";

import {
  applyVocabularyMnemonicUpdate,
  createVocabularyVerification,
  getVocabularyMnemonicRecommendation,
  isVocabularyMnemonicMode,
  normalizeVocabularyMnemonic,
  normalizeVocabularyItem,
  removeVocabularyItemAndCleanup,
  resetVocabularyMnemonic,
  validateVocabularyMnemonic,
  type VocabularyItem,
  type VocabularyMnemonicMode,
  type VocabularyMnemonicStatus,
} from "@/lib/vocabulary";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

function findItemIndex(items: VocabularyItem[], id: string) {
  return items.findIndex((item) => item.id === id);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const items = await readVocabulary();
  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return NextResponse.json({ error: "Карточка словаря не найдена." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    mnemonic_status?: VocabularyMnemonicStatus;
    mnemonic_mode?: VocabularyMnemonicMode;
    mnemonic?: unknown;
    verify_success?: boolean;
    worked_last_time?: boolean;
    request_recommendation?: boolean;
    clear_mnemonic?: boolean;
  };
  const items = await readVocabulary();
  const index = findItemIndex(items, id);

  if (index === -1) {
    return NextResponse.json({ error: "Карточка словаря не найдена." }, { status: 404 });
  }

  const current = items[index];
  const mnemonicMode = isVocabularyMnemonicMode(body.mnemonic_mode)
    ? body.mnemonic_mode
    : current.mnemonic_mode;
  const shouldClearMnemonic = body.clear_mnemonic === true || body.mnemonic_status === "none";
  const nextMnemonic =
    shouldClearMnemonic || body.mnemonic === null
      ? undefined
      : body.mnemonic
        ? normalizeVocabularyMnemonic(body.mnemonic, mnemonicMode)
        : current.mnemonic;
  let updated = applyVocabularyMnemonicUpdate(
    current,
    {
      mnemonic_status: shouldClearMnemonic ? "none" : body.mnemonic_status,
      mnemonic_mode: shouldClearMnemonic ? undefined : mnemonicMode,
      mnemonic: nextMnemonic,
      mnemonic_worked_last_time:
        typeof body.worked_last_time === "boolean" ? body.worked_last_time : undefined,
    },
    new Date()
  );

  if (typeof body.verify_success === "boolean") {
    const verification = createVocabularyVerification(updated, body.verify_success, new Date());

    updated = applyVocabularyMnemonicUpdate(
      updated,
      {
        mnemonic_status: body.verify_success ? "anchored" : "in_progress",
        mnemonic_mode: updated.mnemonic_mode,
        mnemonic: updated.mnemonic,
        mnemonic_verification: verification,
      },
      new Date()
    );
  }

  if (body.worked_last_time === false) {
    updated = applyVocabularyMnemonicUpdate(
      updated,
      {
        mnemonic_status: "in_progress",
        mnemonic_mode: updated.mnemonic_mode,
        mnemonic: updated.mnemonic,
        mnemonic_worked_last_time: false,
      },
      new Date()
    );
  }

  const validationError = validateVocabularyMnemonic(updated, items);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const nextItems = [...items];
  nextItems[index] = shouldClearMnemonic
    ? resetVocabularyMnemonic(updated)
    : normalizeVocabularyItem(updated);
  await writeVocabulary(nextItems);

  return NextResponse.json({
    success: true,
    item: nextItems[index],
    recommendation: body.request_recommendation
      ? getVocabularyMnemonicRecommendation(nextItems[index], "manual")
      : undefined,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const items = await readVocabulary();
  const index = findItemIndex(items, id);

  if (index === -1) {
    return NextResponse.json({ error: "Карточка словаря не найдена." }, { status: 404 });
  }

  const current = items[index];

  if (scope === "mnemonic") {
    const nextItems = [...items];
    nextItems[index] = resetVocabularyMnemonic(current);
    await writeVocabulary(nextItems);

    return NextResponse.json({
      success: true,
      item: nextItems[index],
    });
  }

  const nextItems = removeVocabularyItemAndCleanup(items, id);
  await writeVocabulary(nextItems);

  return NextResponse.json({
    success: true,
    deletedId: id,
  });
}
