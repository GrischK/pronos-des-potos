import { NextResponse } from "next/server";

import { prepareLiveScoreCron } from "@/src/server/live-score-sync";

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

  console.log("[cron/live-scores/prepare] start");

  const result = await prepareLiveScoreCron();

  console.log("[cron/live-scores/prepare] done", {
    hours: result.hours,
    scheduledMatchCount: result.scheduledMatchCount,
    cronJobSkipped: result.cronJob.skipped,
    cronJobReason: result.cronJob.reason ?? null,
  });

  return NextResponse.json(result);
}
