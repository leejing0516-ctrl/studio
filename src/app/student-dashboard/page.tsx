"use client";

import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useSchoolStore } from "@/store/school-store";
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

export default function StudentDashboard() {
  const { user } = useUserStore();
  const router = useRouter();
  const { getStudentById, stocks } = useSchoolStore();
  const hasHydrated = useHydration();

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== "student")) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);

  const student = useMemo(() => {
    if (!user) return null;
    return getStudentById(user.id);
  }, [user, getStudentById]);

  const portfolioValue = useMemo(() => {
    if (!student || !stocks) return 0;
    return (student.assets || []).reduce((total, asset) => {
      const stock = stocks.find(s => s.id === asset.stockId);
      return total + (stock ? stock.price * asset.quantity : 0);
    }, 0);
  }, [student, stocks]);

  if (!hasHydrated || !user || !student) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading...</div>;
  }
  
  if (user.type !== "student") {
    // This state will be brief, but it's a good practice to handle it.
    return <div className="flex min-h-screen items-center justify-center bg-background">Redirecting...</div>;
  }

  const studentPoints = student.points || 0;
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-6">
            歡迎, {user.name}!
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">我的點數</CardTitle>
                <Medal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentPoints.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  您目前的點數結餘
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  虛擬資產
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${portfolioValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  您目前持有股票的總價值
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">班級排名</CardTitle>
                 <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">
                  (排名功能即將推出)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 text-accent" />
                  獎勵商店
                </CardTitle>
              </Header>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  使用您的點數來兌換超棒的獎勵。
                </p>
                <Button onClick={() => router.push('/reward-store')} className="bg-accent hover:bg-accent/90">
                  前往商店
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 text-primary" />
                  虛擬股票市場
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  投資您的虛擬貨幣，看著它成長。
                </p>
                <Button onClick={() => router.push('/stock-market')} variant="outline">
                  開始交易
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
