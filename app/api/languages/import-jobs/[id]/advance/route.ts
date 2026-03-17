import { NextResponse } from "next/server";

import {
  languagePageAssetSchema,
  type LanguagePageAsset,
} from "@/lib/languages";
import { advanceLanguageImportJob } from "@/lib/server/languages-import";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let uploadedPages: Array<{
      asset: LanguagePageAsset;
      bytes: Uint8Array;
    }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawAssets = String(formData.get("pageAssets") ?? "[]");
      const files = formData.getAll("pageImages");

      const parsedAssets = JSON.parse(rawAssets) as unknown[];
      const assets = parsedAssets.map((item) => languagePageAssetSchema.parse(item));

      if (assets.length !== files.length) {
        return NextResponse.json(
          { error: "Page batch manifest does not match uploaded files." },
          { status: 400 }
        );
      }

      uploadedPages = await Promise.all(
        files.map(async (value, index) => {
          if (!(value instanceof File)) {
            throw new Error("Invalid uploaded page image.");
          }

          return {
            asset: assets[index]!,
            bytes: new Uint8Array(await value.arrayBuffer()),
          };
        })
      );
    }

    const job = await advanceLanguageImportJob(id, uploadedPages);
    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not advance import job.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
