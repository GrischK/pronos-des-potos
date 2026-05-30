import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/src/auth/session";
import {
  deletePushSubscription,
  isPushNotificationConfigured,
  upsertPushSubscription,
} from "@/src/server/push-notifications";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

export async function POST(request: Request) {
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

  const parsed = subscriptionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  await upsertPushSubscription({
    auth: parsed.data.keys.auth,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    userId,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = subscriptionSchema.pick({ endpoint: true }).safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  await deletePushSubscription(parsed.data.endpoint, userId);

  return NextResponse.json({ ok: true });
}
