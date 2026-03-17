import { NextResponse } from "next/server";

import { importJobPageAssetSchema } from "@/lib/language-course";
import { createImportJob } from "@/lib/server/language-course-import";
import {
  readImportJobs,
  writeJobPageImage,
} from "@/lib/server/language-course-store";

export async function GET() {
  const jobs = await readImportJobs();
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const sourceFileName = String(formData.get("sourceFileName") ?? "").trim();
  const totalPages = Number(formData.get("totalPages") ?? 0);
  const rawManifest = String(formData.get("pageAssets") ?? "[]");
  const files = formData.getAll("pageImages");

  if (!sourceFileName || !Number.isInteger(totalPages) || totalPages < 1) {
    return NextResponse.json(
      { error: "Invalid import manifest." },
      { status: 400 }
    );
  }

  let pageAssets;

  try {
    const parsed = JSON.parse(rawManifest) as unknown[];
    pageAssets = parsed.map((item) => importJobPageAssetSchema.parse(item));
  } catch {
    return NextResponse.json(
      { error: "Invalid page asset manifest." },
      { status: 400 }
    );
  }

  if (pageAssets.length !== totalPages || files.length !== totalPages) {
    return NextResponse.json(
      { error: "Uploaded page count does not match the manifest." },
      { status: 400 }
    );
  }

  const job = await createImportJob({
    sourceFileName,
    totalPages,
    pageAssets,
  });

  await Promise.all(
    files.map(async (value, index) => {
      if (!(value instanceof File)) {
        throw new Error("Invalid uploaded page image.");
      }

      const expectedFileName = pageAssets[index]?.fileName ?? value.name;
      const bytes = new Uint8Array(await value.arrayBuffer());
      await writeJobPageImage(job.id, expectedFileName, bytes);
    })
  );

  return NextResponse.json(job);
}
