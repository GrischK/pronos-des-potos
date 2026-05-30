CREATE TABLE "PushNotificationDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "kind" TEXT NOT NULL,
    "deliveryKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushNotificationDelivery_deliveryKey_key" ON "PushNotificationDelivery"("deliveryKey");
CREATE INDEX "PushNotificationDelivery_userId_idx" ON "PushNotificationDelivery"("userId");
CREATE INDEX "PushNotificationDelivery_matchId_idx" ON "PushNotificationDelivery"("matchId");
CREATE INDEX "PushNotificationDelivery_kind_idx" ON "PushNotificationDelivery"("kind");

ALTER TABLE "PushNotificationDelivery"
ADD CONSTRAINT "PushNotificationDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushNotificationDelivery"
ADD CONSTRAINT "PushNotificationDelivery_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
