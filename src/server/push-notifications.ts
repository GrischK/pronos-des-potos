import "server-only";

import webpush from "web-push";

import { prisma } from "@/src/db/prisma";

type PushPayload = {
  body: string;
  tag?: string;
  title: string;
  url?: string;
};

let vapidConfigured = false;

function getPushEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    (process.env.BREVO_SENDER_EMAIL?.trim()
      ? `mailto:${process.env.BREVO_SENDER_EMAIL.trim()}`
      : "mailto:no-reply@pronosdespotos.fr");

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys for push notifications.");
  }

  return {
    privateKey,
    publicKey,
    subject,
  };
}

function ensureVapidConfiguration() {
  if (vapidConfigured) {
    return;
  }

  const { privateKey, publicKey, subject } = getPushEnv();

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function isPushNotificationConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

export async function upsertPushSubscription(input: {
  auth: string;
  endpoint: string;
  p256dh: string;
  userId: string;
}) {
  return prisma.pushSubscription.upsert({
    where: {
      endpoint: input.endpoint,
    },
    update: {
      auth: input.auth,
      p256dh: input.p256dh,
      userId: input.userId,
    },
    create: input,
  });
}

export async function deletePushSubscription(endpoint: string, userId: string) {
  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId,
    },
  });
}

export async function hasPushSubscription(userId: string) {
  const subscription = await prisma.pushSubscription.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(subscription);
}

export async function sendPushNotificationToAll(payload: PushPayload) {
  ensureVapidConfiguration();

  const subscriptions = await prisma.pushSubscription.findMany({
    select: {
      auth: true,
      endpoint: true,
      id: true,
      p256dh: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      delivered: 0,
      removed: 0,
      total: 0,
    };
  }

  let delivered = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify(payload),
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: {
              id: subscription.id,
            },
          });
          removed += 1;
          return;
        }

        throw error;
      }
    }),
  );

  return {
    delivered,
    removed,
    total: subscriptions.length,
  };
}

export async function sendPushNotificationToUser(userId: string, payload: PushPayload) {
  ensureVapidConfiguration();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
    },
    select: {
      auth: true,
      endpoint: true,
      id: true,
      p256dh: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      delivered: 0,
      removed: 0,
      total: 0,
    };
  }

  let delivered = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify(payload),
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: {
              id: subscription.id,
            },
          });
          removed += 1;
          return;
        }

        throw error;
      }
    }),
  );

  return {
    delivered,
    removed,
    total: subscriptions.length,
  };
}

export async function sendManualTestPush(userId: string) {
  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Paris",
  }).format(now);

  return sendPushNotificationToUser(userId, {
    body: `Test push déclenché à ${timeLabel}.`,
    tag: "push-test-manual",
    title: "Pronos des potos",
    url: "/competitions",
  });
}
