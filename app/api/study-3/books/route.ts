import { NextResponse } from "next/server";

import {
  createStudyThreeBook,
  readStudyThreeBooks,
} from "@/lib/server/study-3-store";

export async function GET() {
  const books = await readStudyThreeBooks();
  return NextResponse.json({ books });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const titleValue = formData.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не получен." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";

  if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Поддерживаются только PDF и изображения." },
      { status: 400 }
    );
  }

  const title =
    typeof titleValue === "string" && titleValue.trim().length > 0
      ? titleValue.trim()
      : file.name.replace(/\.[^.]+$/, "");

  const buffer = Buffer.from(await file.arrayBuffer());
  const book = await createStudyThreeBook({
    title,
    fileName: file.name,
    mimeType,
    buffer,
  });

  return NextResponse.json({ book });
}
