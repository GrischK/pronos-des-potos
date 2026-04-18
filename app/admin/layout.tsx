import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/src/auth/current-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/competitions");
  }

  return <AppShell showAdminNav>{children}</AppShell>;
}
