"use client";

import { useEffect, useMemo, useState } from "react";

type PushNotificationsTestCardProps = {
  hasExistingSubscription: boolean;
  pushPublicKey: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function PushNotificationsTestCard({
  hasExistingSubscription,
  pushPublicKey,
}: PushNotificationsTestCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "unsupported">(
    hasExistingSubscription ? "enabled" : "idle",
  );
  const [message, setMessage] = useState(
    hasExistingSubscription
      ? "Les notifications test sont déjà activées sur cet appareil."
      : "Active les notifications test pour recevoir une alerte toutes les minutes.",
  );

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator,
    [],
  );

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      setMessage("Cet appareil ou ce navigateur ne supporte pas les notifications push web.");
    }
  }, [isSupported]);

  async function enablePushTest() {
    if (!isSupported || !pushPublicKey) {
      setStatus("unsupported");
      setMessage("La configuration push n'est pas complète sur cette instance.");
      return;
    }

    setStatus("loading");
    setMessage("Activation des notifications test...");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("idle");
        setMessage("Permission refusée. Autorise les notifications puis réessaie.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(pushPublicKey),
          userVisibleOnly: true,
        }));

      const response = await fetch("/api/push/subscribe", {
        body: JSON.stringify(subscription.toJSON()),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Subscription registration failed.");
      }

      setStatus("enabled");
      setMessage("Notifications test activées. La prochaine alerte part au prochain passage minute.");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      setMessage("Impossible d'activer les notifications test pour le moment.");
    }
  }

  async function disablePushTest() {
    if (!isSupported) {
      return;
    }

    setStatus("loading");
    setMessage("Désactivation des notifications test...");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "DELETE",
        });
        await subscription.unsubscribe();
      }

      setStatus("idle");
      setMessage("Notifications test désactivées sur cet appareil.");
    } catch (error) {
      console.error(error);
      setStatus(hasExistingSubscription ? "enabled" : "idle");
      setMessage("Impossible de désactiver les notifications test pour le moment.");
    }
  }

  const actionLabel =
    status === "loading"
      ? "Traitement..."
      : status === "enabled"
        ? "Désactiver sur cet appareil"
        : "Activer les notifications test";

  return (
    <section className="card account-card">
      <h2>Notifications test</h2>
      <div className="account-form">
        <p>{message}</p>
        <div className="actions">
          <button
            className="btn btn-primary"
            disabled={status === "loading" || status === "unsupported"}
            onClick={status === "enabled" ? disablePushTest : enablePushTest}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
