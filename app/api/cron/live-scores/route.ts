import { NextResponse } from "next/server";

import {
  stopLiveScoreCronIfIdle,
  syncLiveScores,
} from "@/src/server/live-score-sync";

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

  console.log("[cron/live-scores] start");

  const result = await syncLiveScores();
  const scheduler = await stopLiveScoreCronIfIdle();

  console.log("[cron/live-scores] done", {
    checkedCount: result.checkedCount,
    updatedCount: result.updatedCount,
    preMatchSentCount: result.notifications.preMatchSentCount,
    finishedMatchSentCount: result.notifications.finishedMatchSentCount,
    errors: result.errors,
    schedulerStopped: scheduler.stopped,
    schedulerReason: scheduler.reason,
  });

  return NextResponse.json({
    ...result,
    scheduler,
  }, {
    status: result.errors.length > 0 ? 207 : 200,
  });
}
