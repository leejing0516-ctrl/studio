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
import { useSchoolStore } from "@/store/school-store";
import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AwardPointsDialog } from "./_components/award-points-dialog";
import { ManageRewardsDialog } from "./_components/manage-rewards-dialog";

export default function TeacherDashboard() {
  const { user } = useUserStore();
  const { classes } = useSchoolStore();
  const router = useRouter();

  const [isAwardPointsOpen, setIsAwardPointsOpen] = useState(false);
  const [isManageRewardsOpen, setIsManageRewardsOpen] = useState(false);

  useEffect(() => {
    if (!user || user.type !== "teacher") {
      router.push("/");
    }
  }, [user, router]);

  if (!user || user.type !== "teacher") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-teal">
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-light-teal">
        <Header />
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-primary mb-6">
              Teacher Dashboard
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Award Points</CardTitle>
                  <CardDescription>
                    Select a class and student to give points.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsAwardPointsOpen(true)} className="bg-accent hover:bg-accent/90">
                    Award Points
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Manage Rewards</CardTitle>
                  <CardDescription>
                    Add, edit, or remove items from the reward store.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsManageRewardsOpen(true)} variant="outline">
                    Manage Rewards
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
