import { NextResponse } from "next/server";

import {
  appendStudyThreeUploadChunk,
  createStudyThreeUploadSession,
  finalizeStudyThreeUpload,
} from "@/lib/server/study-3-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | {
          action?: "start";
          title?: string;
          fileName?: string;
          mimeType?: string;
          totalChunks?: number;
        }
      | {
          action?: "chunk";
          uploadId?: string;
          index?: number;
          base64?: string;
        }
      | {
          action?: "finish";
          uploadId?: string;
        };

    if (body.action === "start") {
      const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
      const totalChunks = Number(body.totalChunks) || 0;
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
      const title =
        typeof body.title === "string" && body.title.trim().length > 0
          ? body.title.trim()
          : fileName.replace(/\.[^.]+$/, "") || "Учебник";

      if (!fileName || totalChunks < 1) {
        return NextResponse.json({ error: "Не хватает метаданных файла." }, { status: 400 });
      }

      if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
        return NextResponse.json(
          { error: "Поддерживаются только PDF и изображения." },
          { status: 400 }
        );
      }

      const session = await createStudyThreeUploadSession({
        title,
        fileName,
        mimeType,
        totalChunks,
      });

      return NextResponse.json({ uploadId: session.uploadId });
    }

    if (body.action === "chunk") {
      const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
      const index = Number(body.index);
      const base64 = typeof body.base64 === "string" ? body.base64 : "";

      if (!uploadId || !Number.isInteger(index) || index < 0 || !base64) {
        return NextResponse.json({ error: "Некорректный chunk." }, { status: 400 });
      }

      await appendStudyThreeUploadChunk({
        uploadId,
        index,
        base64,
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === "finish") {
      const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";

      if (!uploadId) {
        return NextResponse.json({ error: "Не хватает uploadId." }, { status: 400 });
      }

      const book = await finalizeStudyThreeUpload(uploadId);
      return NextResponse.json({ book });
    }

    return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
  } catch (error) {
    console.error("STUDY-3 UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Сбой загрузки учебника." },
      { status: 500 }
    );
  }
}
