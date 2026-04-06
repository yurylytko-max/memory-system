import { NextResponse } from "next/server";

import { createMindPalace, validateMindPalaceTitle } from "@/lib/mind-palaces";
import { readMindPalaces, writeMindPalaces } from "@/lib/server/mind-palaces-store";

export async function GET() {
  const palaces = await readMindPalaces();

  return NextResponse.json({ items: palaces });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string };
  const title = body.title?.trim() ?? "";
  const titleError = validateMindPalaceTitle(title);

  if (titleError) {
    return NextResponse.json({ error: titleError }, { status: 400 });
  }

  const palaces = await readMindPalaces();
  const palace = createMindPalace({ title });

  await writeMindPalaces([...palaces, palace]);

  return NextResponse.json({ item: palace });
}
