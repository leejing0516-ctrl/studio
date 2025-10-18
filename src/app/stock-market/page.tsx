"use client";
import Header from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export default function StockMarket() {

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
                <p className="text-muted-foreground">股票市場目前關閉中。</p>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>我的投資組合</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">$0.00</div>
                        <p className="text-muted-foreground">目前總價值</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>我的資產</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">您尚未擁有任何股票。</p>
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
