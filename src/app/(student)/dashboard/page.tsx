
"use client";

import { useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Trophy, Wallet, BarChart as BarChartIcon, Landmark } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import RewardSuggestion from "@/components/reward-suggestion";
import { StudentDataContext } from "@/context/StudentDataContext";
import { stocks as marketStocks } from "@/lib/placeholder-data";
import { AppDataContext } from "@/context/AppDataContext";
import { cn } from "@/lib/utils";

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
  const { students } = useContext(AppDataContext);
  
  // Find the most up-to-date student info from the source of truth
  const currentStudent = useMemo(() => 
    students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId)
  , [students, studentData.student?.id, studentData.student?.classId]);

  const portfolioValue = useMemo(() => {
    if (!currentStudent) return 0;
    return currentStudent.portfolio.reduce((acc, item) => {
        const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
        const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
        return acc + currentValue;
    }, 0);
  }, [currentStudent]);
  
  const totalLoanAmount = useMemo(() => {
      if (!currentStudent || !currentStudent.loans) return 0;
      return currentStudent.loans
        .filter(l => l.status === 'active' || l.status === 'overdue')
        .reduce((acc, loan) => acc + loan.amount, 0);
  }, [currentStudent]);

  const { rank, percentile } = useMemo(() => {
    if (!currentStudent) return { rank: 0, percentile: 0 };
    
    // Filter students in the same class
    const studentsInClass = students.filter(s => s.classId === currentStudent.classId);

    const studentsWithAssets = studentsInClass.map(student => {
      const studentPortfolioValue = student.portfolio.reduce((acc, item) => {
        const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
        const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
        return acc + currentValue;
      }, 0);
      const totalAssets = student.points + studentPortfolioValue;
      return { ...student, totalAssets };
    });

    studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);

    const studentRank = studentsWithAssets.findIndex(s => s.id === currentStudent.id) + 1;
    const studentPercentile = studentsInClass.length > 1 ? ((studentsInClass.length - studentRank) / (studentsInClass.length - 1) ) * 100 : 100;
    
    return { rank: studentRank, percentile: studentPercentile };
  }, [students, currentStudent]);


  const totalPoints = currentStudent?.points || 0;
  const totalAssets = portfolioValue + totalPoints;
  const stockPerformance = "上週透過投資科技股獲利 5%。";

  if (!currentStudent) {
    return <div>載入中...</div>; // Or a more sophisticated loading state
  }

  return (
    <div className="grid gap-6 animate-in fade-in-0 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">你好, {currentStudent.name}!</h1>
        <p className="text-muted-foreground">歡迎回到您的儀表板。這是您今天的財務狀況概覽。</p>
      </div>
      <div className={cn("grid md:grid-cols-2 gap-6", totalLoanAmount > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總點數</CardTitle>
            <Coins className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPoints.toLocaleString()}
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
         {totalLoanAmount > 0 && (
          <Card className="border-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">目前貸款</CardTitle>
              <Landmark className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {totalLoanAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">需在期限內償還</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">班級排名</CardTitle>
            <Trophy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{rank}</div>
            <p className="text-xs text-muted-foreground">班級前 {100 - Math.floor(percentile)}%</p>
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
            <RewardSuggestion studentPoints={totalPoints} stockMarketPerformance={stockPerformance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
