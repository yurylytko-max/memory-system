import { NextResponse } from "next/server";

import {
  type MindPalaceLocus,
  updateMindPalaceRoute,
  validateMindPalaceTitle,
} from "@/lib/mind-palaces";
import { readMindPalaces, writeMindPalaces } from "@/lib/server/mind-palaces-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const palaces = await readMindPalaces();
  const palace = palaces.find((item) => item.id === id);

  if (!palace) {
    return NextResponse.json({ error: "Чертог не найден." }, { status: 404 });
  }

  return NextResponse.json({ item: palace });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    loci?: MindPalaceLocus[];
  };
  const palaces = await readMindPalaces();
  const existingIndex = palaces.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Чертог не найден." }, { status: 404 });
  }

  const existing = palaces[existingIndex];
  const nextTitle = body.title?.trim() ?? existing.title;
  const titleError = validateMindPalaceTitle(nextTitle);

  if (titleError) {
    return NextResponse.json({ error: titleError }, { status: 400 });
  }

  let updated = {
    ...existing,
    title: nextTitle,
    updated_at: new Date().toISOString(),
  };

  if (Array.isArray(body.loci)) {
    const routeUpdate = updateMindPalaceRoute(existing, body.loci);

    if (routeUpdate.error || !routeUpdate.palace) {
      return NextResponse.json(
        { error: routeUpdate.error ?? "Не удалось сохранить маршрут." },
        { status: 400 }
      );
    }

    updated = {
      ...routeUpdate.palace,
      title: nextTitle,
    };
  }

  const nextPalaces = [...palaces];
  nextPalaces[existingIndex] = updated;
  await writeMindPalaces(nextPalaces);

  return NextResponse.json({ item: updated });
}
