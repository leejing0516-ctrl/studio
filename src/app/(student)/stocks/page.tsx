
"use client";

import { useState, useContext } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Stock, PortfolioItem } from "@/lib/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";

const portfolioHistory = [
  { date: "2024-01-01", value: 2000 },
  { date: "2024-02-01", value: 2200 },
  { date: "2024-03-01", value: 2150 },
  { date: "2024-04-01", value: 2500 },
  { date: "2024-05-01", value: 2400 },
  { date: "2024-06-01", value: 2780 },
];

const chartConfig: ChartConfig = {
  value: {
    label: "價值",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function StocksPage() {
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeShares, setTradeShares] = useState(0);
  const { toast } = useToast();
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents, stocks: marketStocks } = useContext(AppDataContext);
  
  const currentStudent = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId) || studentData.student;
  
  const studentHolding = selectedStock ? currentStudent?.portfolio.find(item => item.ticker === selectedStock.ticker) : null;


  const handleTradeClick = (stock: Stock, type: "buy" | "sell") => {
    setSelectedStock(stock);
    setTradeType(type);
    
    if (type === 'sell') {
      const holding = currentStudent?.portfolio.find(item => item.ticker === stock.ticker);
      if (!holding || holding.shares === 0) {
        toast({
          title: "無法賣出",
          description: `您並未持有任何 ${stock.name} 的股份。`,
          variant: "destructive"
        });
        return;
      }
    }

    setIsTradeDialogOpen(true);
    setTradeShares(0);
  };
  
  const updateStudentInGlobalList = (updatedStudent: any) => {
    setStudents(currentStudents => currentStudents.map(s => 
        (s.id === updatedStudent.id && s.classId === updatedStudent.classId) ? updatedStudent : s
    ));
  };


  const handleConfirmTrade = () => {
    if (!selectedStock || tradeShares <= 0 || !currentStudent) {
      toast({
        title: "交易失敗",
        description: "請輸入有效的股數或重新登入。",
        variant: "destructive",
      });
      setIsTradeDialogOpen(false);
      return;
    }

    const totalCost = tradeShares * selectedStock.price;

    if (tradeType === "buy") {
      if (currentStudent.points < totalCost) {
        toast({
          title: "點數不足",
          description: `您需要 ${totalCost.toLocaleString()} 點才能完成此交易。`,
          variant: "destructive",
        });
        return;
      }

      const newPoints = currentStudent.points - totalCost;
      const existingHolding = currentStudent.portfolio.find(
        (item) => item.ticker === selectedStock.ticker
      );
      
      let newPortfolio: PortfolioItem[];
      if (existingHolding) {
        newPortfolio = currentStudent.portfolio.map((item) => {
          if (item.ticker === selectedStock.ticker) {
            const newShares = item.shares + tradeShares;
            const newTotalCost = item.avgCost * item.shares + totalCost;
            const newAvgCost = newTotalCost / newShares;
            return { ...item, shares: newShares, avgCost: newAvgCost };
          }
          return item;
        });
      } else {
        newPortfolio = [
          ...currentStudent.portfolio,
          {
            ticker: selectedStock.ticker,
            name: selectedStock.name,
            shares: tradeShares,
            avgCost: selectedStock.price,
          },
        ];
      }
      
      const updatedStudent = { ...currentStudent, points: newPoints, portfolio: newPortfolio };
      updateStudentInGlobalList(updatedStudent);
      toast({
        title: "買入成功！",
        description: `您已成功買入 ${tradeShares} 股 ${selectedStock.name}。`,
      });

    } else { // Sell
      const holding = currentStudent.portfolio.find(item => item.ticker === selectedStock.ticker);
      if (!holding || holding.shares < tradeShares) {
        toast({
          title: "持股不足",
          description: `您沒有足夠的 ${selectedStock.name} 股份可供出售。您目前持有 ${holding?.shares || 0} 股。`,
          variant: "destructive",
        });
        return;
      }

      const newPoints = currentStudent.points + totalCost;
      const newPortfolio = currentStudent.portfolio.map(item => {
          if (item.ticker === selectedStock.ticker) {
            return { ...item, shares: item.shares - tradeShares };
          }
          return item;
        }).filter(item => item.shares > 0);

      const updatedStudent = { ...currentStudent, points: newPoints, portfolio: newPortfolio };
      updateStudentInGlobalList(updatedStudent);
      toast({
        title: "賣出成功！",
        description: `您已成功賣出 ${tradeShares} 股 ${selectedStock.name}。`,
      });
    }

    setIsTradeDialogOpen(false);
  };
  
  const portfolioWithValue = (currentStudent?.portfolio || []).map(item => {
    const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
    const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
    const totalCost = item.avgCost * item.shares;
    const totalGain = currentValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    return { ...item, currentValue, totalGain, totalGainPercent };
  });

  return (
    <>
      <Tabs defaultValue="market" className="grid gap-6 animate-in fade-in-0 duration-500">
        <TabsList>
          <TabsTrigger value="market">市場</TabsTrigger>
          <TabsTrigger value="portfolio">我的投資組合</TabsTrigger>
        </TabsList>
        <TabsContent value="market">
          <Card>
            <CardHeader>
              <CardTitle>虛擬股票市場</CardTitle>
              <CardDescription>
                用您的積分投資我們的模擬市場。低買高賣！
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>公司</TableHead>
                    <TableHead className="text-right">價格</TableHead>
                    <TableHead className="text-right">變動</TableHead>
                    <TableHead className="text-right">市值</TableHead>
                    <TableHead className="text-right w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketStocks.map((stock) => (
                    <TableRow key={stock.ticker}>
                      <TableCell>
                        <div className="font-medium">{stock.ticker}</div>
                        <div className="text-sm text-muted-foreground">{stock.name}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${stock.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                          <span className={cn(
                            "flex items-center justify-end gap-1",
                            stock.change > 0 ? "text-destructive" : "text-success",
                          )}>
                              {stock.change < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                              {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                          </span>
                      </TableCell>
                      <TableCell className="text-right">{stock.marketCap}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="mr-2" onClick={() => handleTradeClick(stock, "buy")}>買入</Button>
                        <Button size="sm" variant="outline" onClick={() => handleTradeClick(stock, "sell")}>賣出</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="portfolio">
          <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                  <Card>
                      <CardHeader>
                          <CardTitle>我的投資組合</CardTitle>
                          <CardDescription>您目前的持股。您有 {(currentStudent?.points || 0).toLocaleString()} 點數可用。</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>股票</TableHead>
                                      <TableHead className="text-right">股數</TableHead>
                                      <TableHead className="text-right">目前價值</TableHead>
                                      <TableHead className="text-right">總損益</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {portfolioWithValue.length > 0 ? portfolioWithValue.map((item) => (
                                      <TableRow key={item.ticker}>
                                          <TableCell>
                                              <div className="font-medium">{item.ticker}</div>
                                              <div className="text-sm text-muted-foreground">{item.name}</div>
                                          </TableCell>
                                          <TableCell className="text-right">{item.shares}</TableCell>
                                          <TableCell className="text-right">${item.currentValue.toFixed(2)}</TableCell>
                                          <TableCell className="text-right">
                                              <span className={cn(
                                                "flex items-center justify-end gap-1",
                                                item.totalGain > 0 ? "text-destructive" : "text-success",
                                              )}>
                                                  {item.totalGain < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                                  ${Math.abs(item.totalGain).toFixed(2)} ({item.totalGainPercent.toFixed(2)}%)
                                              </span>
                                          </TableCell>
                                      </TableRow>
                                  )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">您目前沒有任何持股。</TableCell>
                                    </TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
              </div>
              <div className="md:col-span-1">
                  <Card>
                      <CardHeader>
                          <CardTitle>投資組合歷史</CardTitle>
                          <CardDescription>過去 6 個月的總價值。</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={chartConfig} className="h-[300px] w-full">
                              <AreaChart accessibilityLayer data={portfolioHistory} margin={{ left: -20, right: 10, top:10, bottom: 0}}>
                                  <defs>
                                      <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                                          <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value).toLocaleDateString('zh-TW', { month: 'short' })} />
                                  <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 100', 'dataMax + 100']} hide />
                                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                  <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="url(#fillValue)" strokeWidth={2} />
                              </AreaChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
              </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tradeType === 'buy' ? '買入' : '賣出'}股票</DialogTitle>
            <DialogDescription>
               {tradeType === 'buy'
                ? `您目前有 ${(currentStudent?.points || 0).toLocaleString()} 點數。`
                : `您目前持有 ${studentHolding?.shares || 0} 股。`
               }
              {tradeType === 'buy' ? '買入' : '賣出'} {selectedStock?.name} ({selectedStock?.ticker})。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shares" className="text-right">
                股數
              </Label>
              <Input
                id="shares"
                type="number"
                value={tradeShares}
                onChange={(e) => setTradeShares(parseInt(e.target.value, 10) || 0)}
                className="col-span-3"
                min="0"
                max={tradeType === 'sell' ? studentHolding?.shares : undefined}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right col-span-1">價格</p>
                <p className="col-span-3">${selectedStock?.price.toFixed(2)}</p>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-bold col-span-1">總計</p>
                <p className="col-span-3 font-bold">{(tradeShares * (selectedStock?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 點數</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">取消</Button>
            </DialogClose>
            <Button onClick={handleConfirmTrade}>確定{tradeType === 'buy' ? '買入' : '賣出'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
