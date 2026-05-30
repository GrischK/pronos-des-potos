"use client";

import { Bell } from "lucide-react";
import { useMemo, useState } from "react";

type PushNotificationTestButtonProps = {
  pushPublicKey: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function PushNotificationTestButton({
  pushPublicKey,
}: PushNotificationTestButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator,
    [],
  );

  async function ensureSubscription() {
    if (!pushPublicKey) {
      throw new Error("Missing public VAPID key.");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Notification permission denied.");
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
  }

  async function handleClick() {
    if (!isSupported) {
      setMessage("Notifications push non supportées sur cet appareil.");
      return;
    }

    setIsPending(true);
    setMessage("Envoi du test...");

    try {
      await ensureSubscription();

      const response = await fetch("/api/push/test", {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Test push failed.");
      }

      setMessage("Notification test envoyée. Vérifie le téléphone.");
    } catch (error) {
      console.error(error);
      setMessage("Impossible d'envoyer la notification test.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="competition-push-test">
      <button
        className="btn btn-secondary competition-push-test-button"
        disabled={isPending || !pushPublicKey}
        onClick={handleClick}
        type="button"
      >
        <Bell aria-hidden="true" size={16} strokeWidth={2.4} />
        <span>{isPending ? "Envoi..." : "Tester les notifications"}</span>
      </button>
      {message ? <p className="competition-push-test-message">{message}</p> : null}
    </div>
  );
}
