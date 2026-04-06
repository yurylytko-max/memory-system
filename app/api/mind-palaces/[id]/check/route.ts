import { NextResponse } from "next/server";

import {
  type MindPalaceCheckInput,
  runMindPalaceCheck,
} from "@/lib/mind-palaces";
import { readMindPalaces, writeMindPalaces } from "@/lib/server/mind-palaces-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as MindPalaceCheckInput;
  const palaces = await readMindPalaces();
  const existingIndex = palaces.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Чертог не найден." }, { status: 404 });
  }

  const existing = palaces[existingIndex];
  const result = runMindPalaceCheck(existing, body);

  if (result.error || !result.palace) {
    return NextResponse.json(
      { error: result.error ?? "Не удалось проверить маршрут." },
      { status: 400 }
    );
  }

  const nextPalaces = [...palaces];
  nextPalaces[existingIndex] = result.palace;
  await writeMindPalaces(nextPalaces);

  return NextResponse.json({ item: result.palace });
}
