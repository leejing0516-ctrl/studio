"use client";

import { useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Trophy, Wallet, BarChart as BarChartIcon } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import RewardSuggestion from "@/components/reward-suggestion";
import { StudentDataContext } from "@/context/StudentDataContext";
import { stocks as marketStocks } from "@/lib/placeholder-data";

const pointsData = [
  { month: "一月", points: 186 },
  { month: "二月", points: 305 },
  { month: "三月", points: 237 },
  { month: "四月", points: 273 },
  { month: "五月", points: 209 },
  { month: "六月", points: 250 },
];

const chartConfig: ChartConfig = {
  points: {
    label: "點數",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function StudentDashboardPage() {
  const { studentData } = useContext(StudentDataContext);

  const portfolioValue = studentData.portfolio.reduce((acc, item) => {
      const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
      const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
      return acc + currentValue;
  }, 0);
  const totalAssets = portfolioValue + studentData.points;
  const stockPerformance = "上週透過投資科技股獲利 5%。";

  return (
    <div className="grid gap-6 animate-in fade-in-0 duration-500">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總點數</CardTitle>
            <Coins className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentData.points.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">可用於交易或兌換獎勵</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">投資組合價值</CardTitle>
            <BarChartIcon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">本月 +5.2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總資產</CardTitle>
            <Wallet className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">投資組合 + 點數</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">班級排名</CardTitle>
            <Trophy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#3</div>
            <p className="text-xs text-muted-foreground">班級前 10%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>點數進度</CardTitle>
            <CardDescription>您過去 6 個月獲得的點數。</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={pointsData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="points" fill="var(--color-points)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>AI 獎勵顧問</CardTitle>
            <CardDescription>根據您的活動獲得個人化的獎勵建議。</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <RewardSuggestion studentPoints={studentData.points} stockMarketPerformance={stockPerformance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
