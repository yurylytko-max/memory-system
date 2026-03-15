import { NextResponse } from "next/server";

import type { TextDocument } from "@/lib/texts";
import { readTexts, writeTexts } from "@/lib/server/texts-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const texts = await readTexts();
  const text = texts.find((item) => item.id === id);

  if (!text) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  return NextResponse.json(text);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const text = (await request.json()) as TextDocument;
  const texts = await readTexts();

  const existingIndex = texts.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  const updated = [...texts];
  updated[existingIndex] = text;

  await writeTexts(updated);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const texts = await readTexts();

  await writeTexts(texts.filter((text) => text.id !== id));

  return NextResponse.json({ success: true });
}
