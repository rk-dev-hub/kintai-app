import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/rbac";
import { countPending } from "@/features/approval/usecase";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/first-password");

  const pendingCount = user.role === "ADMIN" ? await countPending() : 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-base font-semibold tracking-tight">Kintai</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {user.name}
            {user.role === "ADMIN" ? "（管理者）" : ""}
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="border-border bg-card w-full shrink-0 rounded-lg border p-3 shadow-sm md:w-48">
          <AppNav role={user.role} pendingCount={pendingCount} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
