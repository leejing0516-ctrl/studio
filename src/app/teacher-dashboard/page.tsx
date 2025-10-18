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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AwardPointsDialog } from "./_components/award-points-dialog";
import { ManageRewardsDialog } from "./_components/manage-rewards-dialog";
import { useHydration } from "@/hooks/use-hydration";


function useSimpleUser() {
    const [user, setUser] = useState<{id: string, name: string, type: string} | null>(null);
    const hasHydrated = useHydration();

    useEffect(() => {
        if(hasHydrated) {
            const id = sessionStorage.getItem('teacherId');
            const name = sessionStorage.getItem('userName');
            const type = sessionStorage.getItem('userType');
            if (id && name && type) {
                setUser({ id, name, type });
            }
        }
    }, [hasHydrated]);

    return { user, hasHydrated };
}


export default function TeacherDashboard() {
  const { user, hasHydrated } = useSimpleUser();
  const router = useRouter();

  const [isAwardPointsOpen, setIsAwardPointsOpen] = useState(false);
  const [isManageRewardsOpen, setIsManageRewardsOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== "teacher")) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-teal">
        Loading...
      </div>
    );
  }
  
  if (user.type !== "teacher") {
      return (
          <div className="flex min-h-screen items-center justify-center bg-light-teal">
              Redirecting...
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
