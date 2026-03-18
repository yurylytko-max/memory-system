import { NextResponse } from "next/server";

import type { StudyTextbook } from "@/lib/study";
import { normalizeStudyImport } from "@/lib/study-import";
import { readStudyTextbooks, writeStudyTextbooks } from "@/lib/server/study-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const textbooks = await readStudyTextbooks();
  const textbook = textbooks.find((item) => item.id === id);

  if (!textbook) {
    return NextResponse.json({ error: "Study textbook not found" }, { status: 404 });
  }

  return NextResponse.json(textbook);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const payload = (await request.json()) as StudyTextbook;
  const textbooks = await readStudyTextbooks();
  const existingIndex = textbooks.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Study textbook not found" }, { status: 404 });
  }

  const normalized = normalizeStudyImport(payload);
  const updated = [...textbooks];
  updated[existingIndex] = {
    ...normalized,
    id,
    createdAt: textbooks[existingIndex]?.createdAt ?? normalized.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await writeStudyTextbooks(updated);

  return NextResponse.json(updated[existingIndex]);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const textbooks = await readStudyTextbooks();
  const updated = textbooks.filter((textbook) => textbook.id !== id);

  await writeStudyTextbooks(updated);

  return NextResponse.json({ success: true });
}
