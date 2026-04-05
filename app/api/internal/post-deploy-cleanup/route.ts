import { NextResponse } from "next/server";

import { runPostDeployCleanup } from "@/lib/server/post-deploy-cleanup";

export const runtime = "nodejs";

export async function POST() {
  try {
    await runPostDeployCleanup();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run post-deploy cleanup.",
      },
      { status: 500 }
    );
  }
}
