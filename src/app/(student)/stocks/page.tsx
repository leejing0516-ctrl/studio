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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentsui/tabs";
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
    label: "Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function StocksPage() {
  return (
    <Tabs defaultValue="market" className="grid gap-6 animate-in fade-in-0 duration-500">
      <TabsList>
        <TabsTrigger value="market">Market</TabsTrigger>
        <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
      </TabsList>
      <TabsContent value="market">
        <Card>
          <CardHeader>
            <CardTitle>Virtual Stock Market</CardTitle>
            <CardDescription>
              Invest your points in our simulated market. Buy low, sell high!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
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
                      <Button size="sm" variant="outline" className="mr-2">Buy</Button>
                      <Button size="sm" variant="ghost">Sell</Button>
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
                        <CardTitle>My Portfolio</CardTitle>
                        <CardDescription>Your current stock holdings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right">Shares</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead className="text-right">Total Gain/Loss</TableHead>
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
                        <CardTitle>Portfolio History</CardTitle>
                        <CardDescription>Total value over the last 6 months.</CardDescription>
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
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })} />
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
