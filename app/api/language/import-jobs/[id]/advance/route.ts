import { NextResponse } from "next/server";

import { advanceImportJob } from "@/lib/server/language-course-import";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const job = await advanceImportJob(id);
    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not advance import job.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
