import { NextResponse } from "next/server";

import { readLanguageCourses } from "@/lib/server/languages-store";

export async function GET() {
  return NextResponse.json(await readLanguageCourses());
}
