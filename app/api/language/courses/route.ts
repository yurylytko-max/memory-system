import { NextResponse } from "next/server";

import { getLatestCourse, readCourses } from "@/lib/server/language-course-store";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("latest") === "true") {
    return NextResponse.json(await getLatestCourse());
  }

  return NextResponse.json(await readCourses());
}
