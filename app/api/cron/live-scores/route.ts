import { NextResponse } from "next/server";

import { syncLiveScores } from "@/src/server/live-score-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncLiveScores();

  return NextResponse.json(result, {
    status: result.errors.length > 0 ? 207 : 200,
  });
}
