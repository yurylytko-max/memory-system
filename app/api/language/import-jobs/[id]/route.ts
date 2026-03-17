import { NextResponse } from "next/server";

import { readImportJob } from "@/lib/server/language-course-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const job = await readImportJob(id);

  if (!job) {
    return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}
