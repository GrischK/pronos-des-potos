import { redirect } from "next/navigation";

import { AccountForms } from "@/components/account/AccountForms";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUserId } from "@/src/auth/session";
import { prisma } from "@/src/db/prisma";

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
          <AccountForms user={user} />
        </section>
      </main>
    </AppShell>
  );
}
