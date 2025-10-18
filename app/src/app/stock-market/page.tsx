"use client";
import Header from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { type Student, type Stock } from "@/lib/mock-data";
import { updateStockPrices } from "@/lib/firestore-actions";
import { useSimpleUser } from "@/hooks/use-simple-user";

export default function StockMarket() {
  const { user: sessionUser, isLoading: isSessionLoading } = useSimpleUser();
  const router = useRouter();
  const firestore = useFirestore();

  const stocksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stocks') : null, [firestore]);
  const { data: stocks, isLoading: stocksLoading } = useCollection<Stock>(stocksQuery);

  const studentRef = useMemoFirebase(() => (sessionUser && firestore) ? doc(firestore, 'students', sessionUser.id) : null, [firestore, sessionUser]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);

  useEffect(() => {
    if (!isSessionLoading && (!sessionUser || sessionUser.type !== 'student')) {
      router.push("/");
    }
  }, [sessionUser, isSessionLoading, router]);
  
  useEffect(() => {
    if (!firestore) return;
    const interval = setInterval(() => {
        updateStockPrices(firestore);
    }, 5000);
    return () => clearInterval(interval);
  }, [firestore]);

  const isLoading = isSessionLoading || studentLoading || stocksLoading;

  if (isLoading || !sessionUser || !student) {
    return <div className="flex min-h-screen items-center justify-center bg-background">載入中...</div>;
  }

  const portfolioValue = (student.assets || []).reduce((total, asset) => {
      const stock = stocks?.find(s => s.id === asset.stockId);
      return total + (stock ? stock.price * asset.quantity : 0);
    }, 0);


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-primary mb-6">
                虛擬股票市場
              </h1>
              <div className="space-y-4">
                {(stocks || []).map((stock) => (
                  <Card key={stock.id} className="overflow-hidden">
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{stock.name} ({stock.ticker})</CardTitle>
                                <CardDescription className="text-2xl font-bold text-primary">
                                ${stock.price.toFixed(2)}
                                </CardDescription>
                            </div>
                        </div>
                         <div className="h-48 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stock.history.map((price, index) => ({ name: `T-${stock.history.length - index}`, price }))}
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} domain={['dataMin - 5', 'dataMax + 5']} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            borderColor: "hsl(var(--border))"
                                        }}
                                    />
                                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>我的投資組合</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${portfolioValue.toFixed(2)}</div>
                        <p className="text-muted-foreground">目前總價值</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>我的資產</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(student?.assets || []).length > 0 ? (
                             <ul className="space-y-2">
                                {student.assets.map(asset => {
                                    const stock = stocks?.find(s => s.id === asset.stockId);
                                    return stock ? (
                                        <li key={asset.stockId} className="flex justify-between items-center text-sm">
                                            <span>{stock.ticker}: {asset.quantity} 股</span>
                                            <span className="font-semibold">${(stock.price * asset.quantity).toFixed(2)}</span>
                                        </li>
                                    ) : null;
                                })}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">您尚未擁有任何股票。</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>交易</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground text-sm mb-4">交易功能即將推出!</p>
                        <Button disabled>買入</Button>
                        <Button variant="outline" className="ml-2" disabled>賣出</Button>
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
