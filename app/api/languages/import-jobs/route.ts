import { NextResponse } from "next/server";

import { languagePageAssetSchema } from "@/lib/languages";
import { createLanguageImportJob } from "@/lib/server/languages-import";
import { readLanguageImportJobs } from "@/lib/server/languages-store";

export async function GET() {
  return NextResponse.json(await readLanguageImportJobs());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        sourceFileName?: unknown;
        totalPages?: unknown;
        pageAssets?: unknown;
      }
    | null;
  const sourceFileName = String(body?.sourceFileName ?? "").trim();
  const totalPages = Number(body?.totalPages ?? 0);
  const rawManifest = body?.pageAssets;

  if (!sourceFileName || !Number.isInteger(totalPages) || totalPages < 1) {
    return NextResponse.json(
      { error: "Invalid import manifest." },
      { status: 400 }
    );
  }

  let pageAssets;

  try {
    const parsed = Array.isArray(rawManifest) ? rawManifest : [];
    pageAssets = parsed.map((item) => languagePageAssetSchema.parse(item));
  } catch {
    return NextResponse.json(
      { error: "Invalid page asset manifest." },
      { status: 400 }
    );
  }

  if (pageAssets.length !== totalPages) {
    return NextResponse.json(
      { error: "Page manifest does not match total page count." },
      { status: 400 }
    );
  }

  const job = await createLanguageImportJob({
    sourceFileName,
    totalPages,
    pageAssets,
  });

  return NextResponse.json(job);
}
