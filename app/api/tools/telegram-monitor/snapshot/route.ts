import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshotPath = path.join(
    process.cwd(),
    "app",
    "tools",
    "telegram-monitor",
    "snapshot-data.json",
  );
  const snapshot = await readFile(snapshotPath, "utf8");

  return new NextResponse(snapshot, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
