import { NextResponse } from "next/server";

import type { Plan } from "@/lib/plans";
import { readPlans, writePlans } from "@/lib/server/plans-store";

export async function GET() {
  const plans = await readPlans();
  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const plan = (await request.json()) as Plan;
  const plans = await readPlans();

  await writePlans([...plans, plan]);

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const plans = (await request.json()) as Plan[];

  await writePlans(Array.isArray(plans) ? plans : []);

  return NextResponse.json({ success: true });
}
