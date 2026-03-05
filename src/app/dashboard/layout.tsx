import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </Providers>
  );
}
