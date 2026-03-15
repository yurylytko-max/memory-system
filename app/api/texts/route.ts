import { NextResponse } from "next/server";

import type { TextDocument } from "@/lib/texts";
import { readTexts, writeTexts } from "@/lib/server/texts-store";

export async function GET() {
  const texts = await readTexts();
  return NextResponse.json(texts);
}

export async function POST(request: Request) {
  const text = (await request.json()) as TextDocument;
  const texts = await readTexts();

  await writeTexts([...texts, text]);

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const texts = (await request.json()) as TextDocument[];

  await writeTexts(Array.isArray(texts) ? texts : []);

  return NextResponse.json({ success: true });
}
