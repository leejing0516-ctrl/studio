

"use client";

import { useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Trophy, Wallet, BarChart as BarChartIcon, Landmark, Users, Globe, PiggyBank, Bone } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { cn } from "@/lib/utils";
import { subDays, format, parseISO, startOfDay, isWithinInterval } from "date-fns";
import StudentPet from "@/components/student-pet";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const chartConfig: ChartConfig = {
  points: {
    label: "點數",
    color: "hsl(var(--accent))",
  },
  value: {
    label: "價值",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

export default function StudentDashboardPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, stocks: marketStocks, classes, teachers, platformConfig } = useContext(AppDataContext);

  const cardTexts = useMemo(() => platformConfig?.dashboardCards || {}, [platformConfig]);
  
  const currentStudent = useMemo(() => 
    students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId)
  , [students, studentData.student]);

  const totalPoints = Math.round(currentStudent?.points || 0);

  const pointsData = useMemo(() => {
    if (!currentStudent) return [];
    
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 6);
    
    const dailyPoints: { [key: string]: number } = {};

    // Initialize the last 7 days with 0 points
    for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        dailyPoints[format(date, "yyyy-MM-dd")] = 0;
    }

    // Sum up points for each of the last 7 days from history
    (currentStudent.pointHistory || []).forEach(record => {
        if (!record.date) return;
        const recordDate = startOfDay(parseISO(record.date));
        if (isWithinInterval(recordDate, { start: sevenDaysAgo, end: today })) {
            const dateKey = format(recordDate, "yyyy-MM-dd");
            if (dailyPoints[dateKey] !== undefined && record.points > 0) { // Only count earnings
                dailyPoints[dateKey] += record.points;
            }
        }
    });

    // Format for the chart, sorted by date
    const chartData = Object.keys(dailyPoints)
        .map(dateKey => ({
            date: format(parseISO(dateKey), "M/d"),
            points: Math.round(dailyPoints[dateKey])
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
    return chartData;

  }, [currentStudent]);


  const portfolioValue = useMemo(() => {
    if (!currentStudent) return 0;
    return (currentStudent.portfolio || []).reduce((acc, item) => {
        const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
        const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
        return acc + currentValue;
    }, 0);
  }, [currentStudent, marketStocks]);
  
  const totalLoanAmount = useMemo(() => {
      if (!currentStudent || !currentStudent.loans) return 0;
      return currentStudent.loans
        .filter(l => l.status === 'active' || l.status === 'overdue')
        .reduce((acc, loan) => acc + loan.amount, 0);
  }, [currentStudent]);
  
  const totalDepositAmount = useMemo(() => {
      if (!currentStudent || !currentStudent.fixedDeposits) return 0;
      return currentStudent.fixedDeposits
        .filter(d => d.status === 'active')
        .reduce((acc, deposit) => acc + deposit.amount, 0);
  }, [currentStudent]);


  const { classRank, classPercentile } = useMemo(() => {
    if (!currentStudent) return { classRank: 0, classPercentile: 0 };
    
    const studentsInClass = students.filter(s => s.classId === currentStudent.classId);
    if (studentsInClass.length === 0) return { classRank: 0, classPercentile: 0 };

    const studentsWithAssets = studentsInClass.map(student => {
      const studentPortfolioValue = (student.portfolio || []).reduce((acc, item) => {
        const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
        const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
        return acc + currentValue;
      }, 0);
       const studentTotalDeposits = (student.fixedDeposits || [])
        .filter(d => d.status === 'active')
        .reduce((acc, d) => acc + d.amount, 0);
      const studentTotalLoans = (student.loans || [])
        .filter(l => l.status === 'active' || l.status === 'overdue')
        .reduce((acc, l) => acc + l.amount, 0);
        
      const totalAssets = student.points + studentPortfolioValue + studentTotalDeposits - studentTotalLoans;
      return { ...student, totalAssets };
    });

    studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);

    const studentRank = studentsWithAssets.findIndex(s => s.id === currentStudent.id) + 1;
    const studentPercentile = studentsInClass.length > 1 ? ((studentsInClass.length - studentRank) / (studentsInClass.length - 1) ) * 100 : 100;
    
    return { classRank: studentRank, classPercentile: studentPercentile };
  }, [students, currentStudent, marketStocks]);

  const { schoolRank, schoolPercentile } = useMemo(() => {
    if (!currentStudent || students.length === 0) return { schoolRank: 0, schoolPercentile: 0 };
    
    const studentsWithAssets = students.map(student => {
      const studentPortfolioValue = (student.portfolio || []).reduce((acc, item) => {
        const marketInfo = marketStocks.find(s => s.ticker === item.ticker);
        const currentValue = marketInfo ? marketInfo.price * item.shares : 0;
        return acc + currentValue;
      }, 0);
       const studentTotalDeposits = (student.fixedDeposits || [])
        .filter(d => d.status === 'active')
        .reduce((acc, d) => acc + d.amount, 0);
      const studentTotalLoans = (student.loans || [])
        .filter(l => l.status === 'active' || l.status === 'overdue')
        .reduce((acc, l) => acc + l.amount, 0);
      const totalAssets = student.points + studentPortfolioValue + studentTotalDeposits - studentTotalLoans;
      return { ...student, totalAssets };
    });

    studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);

    const studentRank = studentsWithAssets.findIndex(s => s.id === currentStudent.id && s.classId === currentStudent.classId) + 1;
    const studentPercentile = students.length > 1 ? ((students.length - studentRank) / (students.length - 1) ) * 100 : 100;
    
    return { schoolRank: studentRank, schoolPercentile: studentPercentile };
  }, [students, currentStudent, marketStocks]);


  const studentGroups = useMemo(() => {
    if (!currentStudent?.groupId) return [];
    
    const currentClass = classes.find(c => c.id === currentStudent.classId);
    if (!currentClass || !currentClass.groups) return [];

    const groups: { teacherName: string, groupName: string }[] = [];

    for (const teacherId in currentClass.groups) {
        const groupList = currentClass.groups[teacherId] || [];
        const foundGroup = groupList.find(g => g.id === currentStudent.groupId);
        if (foundGroup) {
            const teacher = teachers.find(t => t.id === teacherId);
            groups.push({
                teacherName: teacher?.name || '未知老師',
                groupName: foundGroup.name
            });
        }
    }
    return groups;
  }, [currentStudent, classes, teachers]);


  const totalAssets = totalPoints + portfolioValue + totalDepositAmount - totalLoanAmount;

  if (!currentStudent) {
    return <div>載入中...</div>;
  }

  return (
    <div className="grid gap-6 animate-in fade-in-0 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">你好, {currentStudent.name}!</h1>
          <p className="text-muted-foreground">歡迎回來！這是您今天的財務狀況概覽。</p>
        </div>
      </div>
      <div className={cn("grid md:grid-cols-2 lg:grid-cols-4 gap-6")}>
        <Card className="bg-chart-1 text-card-title-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-card-title font-medium">{cardTexts.totalPoints?.title || '目前點數'}</CardTitle>
            <Coins className="h-4 w-4 text-card-title-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-card-value font-bold">
              {Math.round(totalPoints).toLocaleString()}
            </div>
            <p className="text-card-description text-card-description-foreground">{cardTexts.totalPoints?.description || '可用於交易或兌換獎勵'}</p>
          </CardContent>
        </Card>
        <Card className="bg-chart-2 text-card-title-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-card-title font-medium">{cardTexts.portfolioValue?.title || '投資價值'}</CardTitle>
            <BarChartIcon className="h-4 w-4 text-card-title-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-card-value font-bold">${Math.round(portfolioValue).toLocaleString()}</div>
            <p className="text-card-description text-card-description-foreground">{cardTexts.portfolioValue?.description || '本月 +5.2%'}</p>
          </CardContent>
        </Card>
        <Card className="bg-chart-3 text-card-title-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-card-title font-medium">{cardTexts.fixedDeposits?.title || '定存點數'}</CardTitle>
                <PiggyBank className="h-4 w-4 text-card-title-foreground/80" />
            </CardHeader>
            <CardContent>
                <div className="text-card-value font-bold">
                {Math.round(totalDepositAmount).toLocaleString()}
                </div>
                <p className="text-card-description text-card-description-foreground">{cardTexts.fixedDeposits?.description || '目前進行中的定期存款'}</p>
            </CardContent>
        </Card>
         {totalLoanAmount > 0 ? (
          <Card className="border-destructive bg-destructive/10 text-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{cardTexts.currentLoan?.title || '目前貸款'}</CardTitle>
              <Landmark className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(totalLoanAmount).toLocaleString()}
              </div>
              <p className="text-xs text-destructive/80">{cardTexts.currentLoan?.description || '需在期限內償還'}</p>
            </CardContent>
          </Card>
        ) : (
            <Card className="bg-chart-4 text-card-title-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-card-title font-medium">{cardTexts.totalAssets?.title || '總資產'}</CardTitle>
                <Wallet className="h-4 w-4 text-card-title-foreground/80" />
              </CardHeader>
              <CardContent>
                <div className="text-card-value font-bold">${Math.round(totalAssets).toLocaleString()}</div>
                <p className="text-card-description text-card-description-foreground">{cardTexts.totalAssets?.description || '點數 + 投資 + 定存'}</p>
              </CardContent>
            </Card>
        )}
        <Card className="bg-dashboard-card text-dashboard-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{cardTexts.classRank?.title || '班級排名'}</CardTitle>
            <Trophy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{classRank}</div>
            <p className="text-xs text-muted-foreground">{(cardTexts.classRank?.description || "班級前 {percentile}%").replace('{percentile}', String(100 - Math.floor(classPercentile)))}</p>
          </CardContent>
        </Card>
        <Card className="bg-dashboard-card text-dashboard-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{cardTexts.schoolRank?.title || '全校排名'}</CardTitle>
            <Globe className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{schoolRank}</div>
            <p className="text-xs text-muted-foreground">{(cardTexts.schoolRank?.description || "全校前 {percentile}%").replace('{percentile}', String(100 - Math.floor(schoolPercentile)))}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 bg-dashboard-card text-dashboard-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{cardTexts.myGroups?.title || '我的分組'}</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
             {studentGroups.length > 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                    {studentGroups.map((group, index) => (
                        <p key={index}>
                            在 **{group.teacherName}** 的課堂中，您是 **{group.groupName}** 的成員。
                        </p>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{cardTexts.myGroups?.description || '您尚未被分派到任何小組。'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2 bg-dashboard-card text-dashboard-card-foreground">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bone /> {cardTexts.myPet?.title || '我的寵物'}</CardTitle>
                <CardDescription>{cardTexts.myPet?.description || '您的點數越多，牠就會越強大！'}</CardDescription>
            </CardHeader>
            <CardContent>
                <StudentPet student={currentStudent} />
            </CardContent>
        </Card>
        <Card className="md:col-span-3 bg-dashboard-card text-dashboard-card-foreground">
          <CardHeader>
            <CardTitle>{cardTexts.pointsTrend?.title || '最近七日點數趨勢'}</CardTitle>
            <CardDescription>{cardTexts.pointsTrend?.description || '您最近七天每日從老師那裡獲得的點數紀錄。'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart accessibilityLayer data={pointsData} margin={{ left: -20, right: 10, top:10, bottom: 0}}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 'dataMax + 10']} hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="points" fill="hsl(var(--accent))" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
