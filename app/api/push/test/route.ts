import { NextResponse } from "next/server";

import { getSessionUserId } from "@/src/auth/session";
import {
  isPushNotificationConfigured,
  sendManualTestPush,
} from "@/src/server/push-notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushNotificationConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on the server." },
      { status: 503 },
    );
  }

  const result = await sendManualTestPush(userId);

  if (result.total === 0) {
    return NextResponse.json(
      { error: "No registered subscription found for this user." },
      { status: 409 },
    );
  }

  return NextResponse.json(result);
}
