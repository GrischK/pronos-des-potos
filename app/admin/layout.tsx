import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { getSessionUserId } from "@/src/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
