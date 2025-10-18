
"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AwardPointsDialog } from "./_components/award-points-dialog";
import { ManageRewardsDialog } from "./_components/manage-rewards-dialog";
import { useHydration } from "@/hooks/use-hydration";

export default function TeacherDashboard() {
  const { user } = useUserStore();
  const router = useRouter();
  const hasHydrated = useHydration();

  const [isAwardPointsOpen, setIsAwardPointsOpen] = useState(false);
  const [isManageRewardsOpen, setIsManageRewardsOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== "teacher")) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        Loading...
      </div>
    );
  }

  if (user.type !== "teacher") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        Redirecting...
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-primary mb-6">
              老師儀表板
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>獎勵點數</CardTitle>
                  <CardDescription>
                    選擇班級和學生以給予點數。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsAwardPointsOpen(true)}>
                    獎勵點數
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>管理獎勵</CardTitle>
                  <CardDescription>
                    新增、編輯或從獎勵商店中移除物品。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsManageRewardsOpen(true)} variant="outline">
                    管理獎勵
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <AwardPointsDialog
        isOpen={isAwardPointsOpen}
        setIsOpen={setIsAwardPointsOpen}
      />
      <ManageRewardsDialog
        isOpen={isManageRewardsOpen}
        setIsOpen={setIsManageRewardsOpen}
      />
    </>
  );
}
