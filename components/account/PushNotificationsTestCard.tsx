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
      ? "Les notifications sont activées sur cet appareil."
      : "Active les notifications pour recevoir les alertes importantes sur cet appareil.",
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

  const isIosStandaloneRequired = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const isIos =
      /iP(ad|hone|od)/.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);

    return isIos && !isStandalone;
  }, []);

  async function readApiError(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function enablePush() {
    if (!isSupported || !pushPublicKey) {
      setStatus("unsupported");
      setMessage("La configuration push n'est pas complète sur cette instance.");
      return;
    }

    if (isIosStandaloneRequired) {
      setStatus("idle");
      setMessage("Sur iPhone, installe d'abord la PWA sur l'écran d'accueil pour activer les notifications.");
      return;
    }

    setStatus("loading");
    setMessage("Activation des notifications...");

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
        throw new Error(
          await readApiError(
            response,
            "L'enregistrement de l'abonnement push a échoué.",
          ),
        );
      }

      if ("showNotification" in registration) {
        await registration.showNotification("Notifications activées", {
          body: "Tu recevras les rappels importants de tes pronos sur cet appareil.",
          icon: "/android-chrome-192x192.png",
          badge: "/favicon-32x32.png",
          tag: "push-activation-success",
          data: {
            url: "/mon-compte",
          },
        });
      } else {
        new Notification("Notifications activées", {
          body: "Tu recevras les rappels importants de tes pronos sur cet appareil.",
        });
      }

      setStatus("enabled");
      setMessage("Notifications activées sur cet appareil.");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'activer les notifications pour le moment.",
      );
    }
  }

  async function disablePush() {
    if (!isSupported) {
      return;
    }

    setStatus("loading");
    setMessage("Désactivation des notifications...");

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
      setMessage("Notifications désactivées sur cet appareil.");
    } catch (error) {
      console.error(error);
      setStatus(hasExistingSubscription ? "enabled" : "idle");
      setMessage("Impossible de désactiver les notifications pour le moment.");
    }
  }

  const actionLabel =
    status === "loading"
      ? "Traitement..."
      : status === "enabled"
        ? "Désactiver sur cet appareil"
        : "Activer les notifications";

  return (
    <section className="card account-card">
      <h2>Notifications</h2>
      <div className="account-form">
        <p>{message}</p>
        <div className="actions mt-auto">
          <button
            className="btn btn-primary"
            disabled={status === "loading" || status === "unsupported"}
            onClick={status === "enabled" ? disablePush : enablePush}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
