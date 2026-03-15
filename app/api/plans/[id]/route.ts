import { NextResponse } from "next/server";

import type { Plan } from "@/lib/plans";
import { readPlans, writePlans } from "@/lib/server/plans-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const plans = await readPlans();
  const plan = plans.find((item) => item.id === id);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const plan = (await request.json()) as Plan;
  const plans = await readPlans();

  const existingIndex = plans.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const updated = [...plans];
  updated[existingIndex] = plan;

  await writePlans(updated);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const plans = await readPlans();

  await writePlans(plans.filter((plan) => plan.id !== id));

  return NextResponse.json({ success: true });
}
