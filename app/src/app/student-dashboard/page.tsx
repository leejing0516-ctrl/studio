
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Medal, ShoppingCart, TrendingUp, User as UserIcon } from "lucide-react";
import Header from "@/components/header";
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Student, Stock } from "@/lib/mock-data";
import { useSimpleUser } from "@/hooks/use-simple-user";

export default function StudentDashboard() {
  const { user: sessionUser, isLoading: isSessionLoading } = useSimpleUser();
  const router = useRouter();
  const firestore = useFirestore();

  const studentRef = useMemoFirebase(() => (sessionUser && firestore) ? doc(firestore, 'students', sessionUser.id) : null, [firestore, sessionUser]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);

  const stocksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stocks') : null, [firestore]);
  const { data: stocks, isLoading: stocksLoading } = useCollection<Stock>(stocksQuery);

  useEffect(() => {
    if (!isSessionLoading && (!sessionUser || sessionUser.type !== "student")) {
      router.push("/");
    }
  }, [sessionUser, isSessionLoading, router]);

  const portfolioValue = useMemo(() => {
    if (!student || !stocks) return 0;
    return (student.assets || []).reduce((total, asset) => {
      const stock = stocks.find(s => s.id === asset.stockId);
      return total + (stock ? stock.price * asset.quantity : 0);
    }, 0);
  }, [student, stocks]);

  const isLoading = isSessionLoading || studentLoading || stocksLoading;

  if (isLoading || !sessionUser) {
    return <div className="flex min-h-screen items-center justify-center bg-background">載入中...</div>;
  }
  
  if (!student) {
     return <div className="flex min-h-screen items-center justify-center bg-background">正在獲取學生資料...</div>;
  }
  
  const studentPoints = student.points || 0;
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-6">
            歡迎, {sessionUser.name}!
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
                  您目前的點數餘額
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
                  您目前股票的總價值
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">班級排名</CardTitle>
                 <UserIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">
                  (排名即將推出)
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
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  用您的點數兌換超棒的獎勵。
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
