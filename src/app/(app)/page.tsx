import { requireUser } from "@/features/auth/rbac";
import { getTodayState } from "@/features/time-clock/usecase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockPanel } from "./clock-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = await getTodayState(user.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">打刻</h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.name} さん</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>本日の打刻</CardTitle>
        </CardHeader>
        <CardContent>
          <ClockPanel initial={today} />
        </CardContent>
      </Card>
    </div>
  );
}
