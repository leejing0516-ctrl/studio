
"use client";

import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Medal, ShoppingCart, TrendingUp, User } from "lucide-react";
import Header from "@/components/header";
import { useHydration } from "@/hooks/use-hydration";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Student } from "@/store/school-store";

export default function StudentDashboard() {
  const { user } = useUserStore();
  const router = useRouter();
  const hasHydrated = useHydration();
  const firestore = useFirestore();

  const studentRef = useMemoFirebase(() => user ? doc(firestore, 'students', user.id) : null, [firestore, user]);
  const { data: student, isLoading, error } = useDoc<Student>(studentRef);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== "student")) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated || !user || user.type !== "student" || isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading...</div>;
  }
  
  if (!student) {
    if (error) console.error(error);
    // This can happen briefly while data is loading or if the doc doesn't exist
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-teal">
        Loading student data...
      </div>
    );
  }

  const studentPoints = student.points || 0;
  
  return (
    <div className="flex min-h-screen flex-col bg-light-teal">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-6">
            Welcome, {user.name}!
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Points</CardTitle>
                <Medal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentPoints.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Your current point balance
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Virtual Assets
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">
                  (Asset calculation coming soon)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
                 <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">
                  (Ranking coming soon)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 text-accent" />
                  Reward Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Use your points to redeem awesome rewards.
                </p>
                <Button onClick={() => router.push('/reward-store')} className="bg-accent hover:bg-accent/90">
                  Go to Store
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 text-primary" />
                  Virtual Stock Market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Invest your virtual money and watch it grow.
                </p>
                <Button onClick={() => router.push('/stock-market')} variant="outline">
                  Start Trading
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
