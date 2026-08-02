import { listMissions } from "@/lib/memory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const missions = await listMissions(30);
    return NextResponse.json({ missions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
