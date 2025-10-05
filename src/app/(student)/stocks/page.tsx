
"use client";

import { useState, useContext, useMemo, useEffect } from "react";
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
import type { Stock, PortfolioItem, Student, PlatformConfig, Announcement } from "@/lib/types";
import { ArrowUp, ArrowDown, Briefcase, Megaphone, Zap } from "lucide-react";
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
import { subMonths, format, isSameDay, startOfDay, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const chartConfig: ChartConfig = {
  value: {
    label: "價值",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const Marquee = ({ messages }: { messages: string[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const validMessages = useMemo(() => messages.filter(m => m.trim() !== ''), [messages]);

    useEffect(() => {
        if (validMessages.length <= 1) return;

        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % validMessages.length);
                setIsVisible(true);
            }, 500); // Wait for fade out
        }, 4000); // 2s display + 2s pause/transition

        return () => clearInterval(interval);
    }, [validMessages.length]);

    if (validMessages.length === 0) return null;

    return (
        <div className="flex justify-center">
            <div className="relative flex w-full max-w-2xl h-10 items-center justify-center overflow-hidden rounded-md border border-primary/20 bg-primary/10 py-2 text-primary">
                <div className={cn(
                    "flex items-center gap-2 transition-opacity duration-500",
                    isVisible ? "opacity-100" : "opacity-0"
                )}>
                    <Zap className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-semibold">{validMessages[currentIndex]}</span>
                </div>
            </div>
        </div>
    );
}

export default function StocksPage() {
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeShares, setTradeShares] = useState(0);
  const { toast } = useToast();
  const { studentData } = useContext(StudentDataContext);
  const { stocks: marketStocks, isMarketOpen, runTransaction, setStudents, platformConfig } = useContext(AppDataContext);
  
  const currentStudent = studentData.student;
  
  const studentHolding = selectedStock ? currentStudent?.portfolio.find(item => item.ticker === selectedStock.ticker) : null;
  
  const stockMarketNews = useMemo(() => {
    return (platformConfig?.stockMarketNews || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [platformConfig]);

  const portfolioHistory = useMemo(() => {
    if (!currentStudent) return [];

    const history = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        let totalValue = 0;

        (currentStudent.portfolio || []).forEach(holding => {
            const marketInfo = marketStocks.find(s => s.ticker === holding.ticker);
            if (marketInfo) {
                // Simulate historical price: simple linear volatility for visual effect
                const volatility = (holding.ticker.charCodeAt(0) % 10) / 50; // 0 to 0.18
                const priceModifier = 1 - (5 - i) * 0.05 + volatility * ((5 - i) % 3 - 1);
                const historicalPrice = marketInfo.price * priceModifier;
                totalValue += historicalPrice * holding.shares;
            }
        });
        
        return {
            date: format(date, "yyyy-MM"),
            value: Math.round(totalValue),
        };
    });

    return history;
  }, [currentStudent, marketStocks]);


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
      // Day trading prevention
      if (holding.lastPurchaseDate && isSameDay(new Date(holding.lastPurchaseDate), startOfDay(new Date()))) {
         toast({
          title: "無法賣出",
          description: "今日買入的股票，當日不可賣出。",
          variant: "destructive"
        });
        return;
      }
    }

    setIsTradeDialogOpen(true);
    setTradeShares(0);
  };

  const handleConfirmTrade = async () => {
    if (!selectedStock || tradeShares <= 0 || !currentStudent) {
      toast({
        title: "交易失敗",
        description: "請輸入有效的股數或重新登入。",
        variant: "destructive",
      });
      setIsTradeDialogOpen(false);
      return;
    }

    const totalCost = Math.round(tradeShares * selectedStock.price);

    try {
        await setStudents(prevStudents => {
             return prevStudents.map(student => {
                if (student.id === currentStudent.id) {
                     if (tradeType === "buy") {
                        if (student.points < totalCost) {
                            throw new Error(`您的點數不足。需要 ${totalCost.toLocaleString()} 點。`);
                        }
                        
                        const newPoints = student.points - totalCost;
                        
                        const existingHolding = (student.portfolio || []).find(item => item.ticker === selectedStock.ticker);
                        let newPortfolio: PortfolioItem[];
                        const todayString = new Date().toISOString();

                        if (existingHolding) {
                            newPortfolio = (student.portfolio || []).map(item => {
                                if (item.ticker === selectedStock.ticker) {
                                    const newShares = item.shares + tradeShares;
                                    const newTotalCost = item.avgCost * item.shares + totalCost;
                                    const newAvgCost = newTotalCost / newShares;
                                    return { ...item, shares: newShares, avgCost: newAvgCost, lastPurchaseDate: todayString };
                                }
                                return item;
                            });
                        } else {
                            newPortfolio = [
                                ...(student.portfolio || []),
                                {
                                    ticker: selectedStock.ticker,
                                    name: selectedStock.name,
                                    shares: tradeShares,
                                    avgCost: selectedStock.price,
                                    lastPurchaseDate: todayString,
                                },
                            ];
                        }
                        return { ...student, points: newPoints, portfolio: newPortfolio };

                    } else { // Sell
                        const holding = (student.portfolio || []).find(item => item.ticker === selectedStock.ticker);
                        if (!holding || holding.shares < tradeShares) {
                            throw new Error(`您沒有足夠的 ${selectedStock.name} 股份可供出售。`);
                        }
                        if (holding.lastPurchaseDate && isSameDay(new Date(holding.lastPurchaseDate), startOfDay(new Date()))) {
                            throw new Error("今日買入的股票，當日不可賣出。");
                        }

                        const newPoints = student.points + totalCost;
                        
                        const newPortfolio = (student.portfolio || []).map(item => {
                            if (item.ticker === selectedStock.ticker) {
                                return { ...item, shares: item.shares - tradeShares };
                            }
                            return item;
                        }).filter(item => item.shares > 0);

                        return { ...student, points: newPoints, portfolio: newPortfolio };
                    }
                }
                return student;
            })
        });
        
        toast({
            title: `${tradeType === 'buy' ? '買入' : '賣出'}成功！`,
            description: `您已成功${tradeType === 'buy' ? '買入' : '賣出'} ${tradeShares} 股 ${selectedStock.name}。`,
        });

    } catch (error: any) {
        console.error("Stock trade failed:", error);
        toast({ title: "交易失敗", description: error.message, variant: "destructive" });
    } finally {
        setIsTradeDialogOpen(false);
    }
  };
  
  const portfolioWithValue = (currentStudent?.portfolio || []).map(item => {
    const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
    const currentPrice = marketInfo ? marketInfo.price : 0;
    const currentValue = currentPrice * item.shares;
    const totalCost = item.avgCost * item.shares;
    const totalGain = currentValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    return { ...item, currentPrice, currentValue, totalGain, totalGainPercent };
  });

  const NewsItem = ({ news }: { news: Announcement }) => {
    return (
      <Alert>
        <Megaphone className="h-4 w-4" />
        <AlertTitle className="flex justify-between items-center">
            {news.title}
            <span className="text-xs font-normal text-muted-foreground">
                {formatDistanceToNow(new Date(news.date), { addSuffix: true, locale: zhTW })}
            </span>
        </AlertTitle>
        <AlertDescription className="whitespace-pre-wrap">{news.content}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <Marquee messages={platformConfig?.stockMarqueeMessages || []} />
        {stockMarketNews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Megaphone />股市重大消息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockMarketNews.slice(0,2).map(news => <NewsItem key={news.id} news={news} />)}
            </CardContent>
          </Card>
        )}
        <Tabs defaultValue="market" className="grid gap-6 animate-in fade-in-0 duration-500">
            <div className="flex justify-between items-center">
                <TabsList>
                <TabsTrigger value="market">市場</TabsTrigger>
                <TabsTrigger value="portfolio">我的投資組合</TabsTrigger>
                </TabsList>
                <Badge variant={isMarketOpen ? "default" : "destructive"} className="transition-all">
                    {isMarketOpen ? `開盤中 (至 ${platformConfig?.marketCloseHour || 14}:00)` : "股市已收盤"}
                </Badge>
            </div>
            <TabsContent value="market">
            <Card>
                <CardHeader>
                <CardTitle>虛擬股票市場</CardTitle>
                <CardDescription>
                    用您的積分投資我們的模擬市場。開盤時間為週一至週五，早上 {platformConfig?.marketOpenHour || 9}:00 至下午 {platformConfig?.marketCloseHour || 14}:00。
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
                                stock.change >= 0 ? "text-success" : "text-destructive",
                            )}>
                                {stock.change < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                            </span>
                        </TableCell>
                        <TableCell className="text-right">{stock.marketCap}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" className="mr-2" onClick={() => handleTradeClick(stock, "buy")} disabled={!isMarketOpen}>買入</Button>
                            <Button size="sm" variant="outline" onClick={() => handleTradeClick(stock, "sell")} disabled={!isMarketOpen}>賣出</Button>
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
                            <CardTitle className="flex items-center gap-2"><Briefcase />我的投資組合</CardTitle>
                            <CardDescription>您目前的持股。您有 {Math.round(currentStudent?.points || 0).toLocaleString()} 點數可用。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>股票</TableHead>
                                        <TableHead className="text-right">股數</TableHead>
                                        <TableHead className="text-right">平均成本</TableHead>
                                        <TableHead className="text-right">目前價格</TableHead>
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
                                            <TableCell className="text-right">${item.avgCost.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${item.currentPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${item.currentValue.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "flex items-center justify-end gap-1",
                                                    item.totalGain >= 0 ? "text-success" : "text-destructive",
                                                )}>
                                                    {item.totalGain < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                                    ${Math.abs(item.totalGain).toFixed(2)} ({item.totalGainPercent.toFixed(2)}%)
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">您目前沒有任何持股。</TableCell>
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
      </div>

      <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tradeType === 'buy' ? '買入' : '賣出'}股票</DialogTitle>
            <DialogDescription>
               {tradeType === 'buy'
                ? `您目前有 ${Math.round(currentStudent?.points || 0).toLocaleString()} 點數。`
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
                <p className="col-span-3 font-bold">{Math.round(tradeShares * (selectedStock?.price || 0)).toLocaleString()} 點數</p>
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
