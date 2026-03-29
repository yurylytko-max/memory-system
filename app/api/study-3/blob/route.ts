import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const normalizedPath = pathname.startsWith("study-3/")
          ? pathname
          : `study-3/${pathname.replace(/^\/+/, "")}`;

        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
          pathname: normalizedPath,
        };
      },
      onUploadCompleted: async () => {
        // Metadata is persisted by the app after client upload succeeds.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось подготовить upload в Blob." },
      { status: 400 }
    );
  }
}
