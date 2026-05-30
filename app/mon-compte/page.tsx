import { redirect } from "next/navigation";

import { AccountForms } from "@/components/account/AccountForms";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUserId } from "@/src/auth/session";
import { prisma } from "@/src/db/prisma";
import { isPushNotificationConfigured } from "@/src/server/push-notifications";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      pushSubscriptions: {
        select: {
          id: true,
        },
        take: 1,
      },
      image: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell showAdminNav={user.role === "ADMIN"}>
      <main className="page-shell">
        <PageHeader
          eyebrow="Compte"
          title="Mon compte"
          description="Gère ton identité de joueur, ta photo de profil et tes accès."
        />

        <section className="page-section">
          <AccountForms
            pushPublicKey={
              isPushNotificationConfigured()
                ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
                : null
            }
            user={{
              email: user.email,
              hasPushSubscription: user.pushSubscriptions.length > 0,
              image: user.image,
              name: user.name,
            }}
          />
        </section>
      </main>
    </AppShell>
  );
}
