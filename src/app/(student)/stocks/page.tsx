"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stocks, portfolio } from "@/lib/placeholder-data";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils";

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
  return (
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
                  <TableHead className="text-right w-[150px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock) => (
                  <TableRow key={stock.ticker}>
                    <TableCell>
                      <div className="font-medium">{stock.ticker}</div>
                      <div className="text-sm text-muted-foreground">{stock.name}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${stock.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                        <span className={cn("flex items-center justify-end gap-1", stock.change < 0 && "text-destructive")}>
                            {stock.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                        </span>
                    </TableCell>
                    <TableCell className="text-right">{stock.marketCap}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="mr-2">買入</Button>
                      <Button size="sm" variant="ghost">賣出</Button>
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
                        <CardDescription>您目前的持股。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>股票</TableHead>
                                    <TableHead className="text-right">股數</TableHead>
                                    <TableHead className="text-right">價值</TableHead>
                                    <TableHead className="text-right">總損益</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portfolio.map((item) => (
                                    <TableRow key={item.ticker}>
                                        <TableCell>
                                            <div className="font-medium">{item.ticker}</div>
                                            <div className="text-sm text-muted-foreground">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.shares}</TableCell>
                                        <TableCell className="text-right">${item.currentValue.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn("flex items-center justify-end gap-1", item.totalGain < 0 && "text-destructive")}>
                                                {item.totalGain >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                ${Math.abs(item.totalGain).toFixed(2)} ({item.totalGainPercent.toFixed(2)}%)
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
  );
}
