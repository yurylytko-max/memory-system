import { NextResponse } from "next/server";

import type { StudyTextbook } from "@/lib/study";
import { normalizeStudyImport } from "@/lib/study-import";
import { readStudyTextbooks, writeStudyTextbooks } from "@/lib/server/study-store";

export async function GET() {
  const textbooks = await readStudyTextbooks();
  return NextResponse.json(textbooks);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as StudyTextbook;
  const textbook = normalizeStudyImport(payload);
  const textbooks = await readStudyTextbooks();

  await writeStudyTextbooks([...textbooks, textbook]);

  return NextResponse.json(textbook);
}

export async function PUT(request: Request) {
  const textbooks = (await request.json()) as StudyTextbook[];

  await writeStudyTextbooks(Array.isArray(textbooks) ? textbooks : []);

  return NextResponse.json({ success: true });
}
