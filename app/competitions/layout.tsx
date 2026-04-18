import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/src/auth/current-user";

export default async function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell showAdminNav={user.role === "ADMIN"}>{children}</AppShell>;
}
