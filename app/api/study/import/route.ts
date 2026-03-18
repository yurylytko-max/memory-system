import { NextResponse } from "next/server";

import { normalizeStudyImport } from "@/lib/study-import";

export async function POST(request: Request) {
  const payload = await request.json();
  const textbook = normalizeStudyImport(payload);
  return NextResponse.json(textbook);
}
