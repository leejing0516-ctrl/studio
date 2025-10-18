"use client";
import Header from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserStore } from "@/store/user-store";
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
import { useHydration } from "@/hooks/use-hydration";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { type Student, type Stock } from "@/store/school-store";
import { updateStockPrices } from "@/lib/firestore-actions";

export default function StockMarket() {
  const { user } = useUserStore();
  const router = useRouter();
  const hasHydrated = useHydration();
  const firestore = useFirestore();

  const stocksQuery = useMemoFirebase(() => collection(firestore, 'stocks'), [firestore]);
  const { data: stocks, isLoading: stocksLoading } = useCollection<Stock>(stocksQuery);

  const studentRef = useMemoFirebase(() => user ? doc(firestore, 'students', user.id) : null, [firestore, user]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== 'student')) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);
  
  // Simulate stock price updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // This now needs to be an action that updates firestore
      // For now, we can call a function that would do this.
      // In a real app this would be a cloud function.
      if (stocks) {
        updateStockPrices(stocks);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [stocks]);

  if (!hasHydrated || studentLoading || stocksLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading...</div>;
  }
  
  if (!user || user.type !== 'student') {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Redirecting...</div>;
  }

  if (!student) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading student data...</div>;
  }

  const portfolioValue = student.assets.reduce((total, asset) => {
      const stock = stocks?.find(s => s.id === asset.stockId);
      return total + (stock ? stock.price * asset.quantity : 0);
    }, 0);


  return (
    <div className="flex min-h-screen flex-col bg-light-teal">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content: Stock List */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-primary mb-6">
                Virtual Stock Market
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
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
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

            {/* Sidebar: Portfolio */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${portfolioValue.toFixed(2)}</div>
                        <p className="text-muted-foreground">Current total value</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>My Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {student?.assets.length ? (
                             <ul className="space-y-2">
                                {student.assets.map(asset => {
                                    const stock = stocks?.find(s => s.id === asset.stockId);
                                    return stock ? (
                                        <li key={asset.stockId} className="flex justify-between items-center text-sm">
                                            <span>{stock.ticker}: {asset.quantity} shares</span>
                                            <span className="font-semibold">${(stock.price * asset.quantity).toFixed(2)}</span>
                                        </li>
                                    ) : null;
                                })}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">You don't own any stocks yet.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Trade</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground text-sm mb-4">Trading features coming soon!</p>
                        <Button disabled>Buy</Button>
                        <Button variant="outline" className="ml-2" disabled>Sell</Button>
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
