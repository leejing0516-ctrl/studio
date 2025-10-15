
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Trophy, Wallet, BarChart as BarChartIcon, Landmark, Users, Globe, PiggyBank, Bone, BookUp, Star } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useSchoolStore } from "@/store/useSchoolStore";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { subDays, format, parseISO, startOfDay, isWithinInterval } from "date-fns";
import StudentPet from "@/components/student-pet";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import DailyReward from "./DailyReward";
import { hslToHex } from '@/lib/utils';
import type { DashboardCardConfig } from "@/lib/types";


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

const DashboardCard = ({ cardKey, title, value, description, icon: Icon }: { cardKey: keyof DashboardCardConfig, title: string, value: string | number, description: string, icon: React.ElementType }) => {
    const { config: platformConfig } = useSchoolStore();
    const cardConfig = platformConfig?.dashboardCards?.[cardKey];
    
    if (!cardConfig || typeof cardConfig === 'string') return null;

    const cardStyle = {
        backgroundColor: hslToHex(cardConfig.backgroundColor),
        color: hslToHex(cardConfig.textColor),
    };

    const iconColor = hslToHex(cardConfig.textColor);

    const fontSizes = {
        title: platformConfig.dashboardCards.cardTitleSize || '0.875rem',
        value: platformConfig.dashboardCards.cardValueSize || '1.5rem',
        description: platformConfig.dashboardCards.cardDescriptionSize || '0.75rem',
    }

    return (
        <Card style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium" style={{color: cardStyle.color, opacity: 0.9, fontSize: fontSizes.title }}>{title}</CardTitle>
            <Icon className="h-4 w-4" style={{ color: iconColor, opacity: 0.8 }} />
          </CardHeader>
          <CardContent>
            <div className="font-bold" style={{color: cardStyle.color, fontSize: fontSizes.value}}>
              {value}
            </div>
            <p style={{color: cardStyle.color, opacity: 0.9, fontSize: fontSizes.description}}>{description}</p>
          </CardContent>
        </Card>
    );
};

export default function StudentDashboardPage() {
  const { student } = useAuth();
  const { students, stocks: marketStocks, classes, teachers, config: platformConfig } = useSchoolStore();

  const cardConfig = useMemo(() => platformConfig?.dashboardCards || {}, [platformConfig]);
  
  const currentStudent = student;

  const totalPoints = Math.round(Number(currentStudent?.points || 0));

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
    if (!currentStudent || !marketStocks) return 0;
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
    if (!currentStudent || !students || !marketStocks) return { classRank: 0, classPercentile: 0 };
    
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
        
      const totalAssets = (Number(student.points) || 0) + studentPortfolioValue + studentTotalDeposits - studentTotalLoans;
      return { ...student, totalAssets };
    });

    studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);

    const studentRank = studentsWithAssets.findIndex(s => s.id === currentStudent.id) + 1;
    const studentPercentile = studentsInClass.length > 1 ? ((studentsInClass.length - studentRank) / (studentsInClass.length - 1) ) * 100 : 100;
    
    return { classRank: studentRank, classPercentile: studentPercentile };
  }, [students, currentStudent, marketStocks]);

  const { schoolRank, schoolPercentile } = useMemo(() => {
    if (!currentStudent || !students || !marketStocks) return { schoolRank: 0, schoolPercentile: 0 };
    
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
      const totalAssets = (Number(student.points) || 0) + studentPortfolioValue + studentTotalDeposits - studentTotalLoans;
      return { ...student, totalAssets };
    });

    studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);

    const studentRank = studentsWithAssets.findIndex(s => s.id === currentStudent.id && s.classId === currentStudent.classId) + 1;
    const percentile = students.length > 1 ? ((students.length - studentRank) / (students.length - 1) ) * 100 : 100;
    
    return { schoolRank: studentRank, schoolPercentile: percentile };
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

  if (!currentStudent || !cardConfig || typeof cardConfig.totalPoints === 'string' ) {
    return <div>載入中...</div>;
  }
  
  const myPetCardConfig = cardConfig.myPet;
  const myPetCardStyle = myPetCardConfig && typeof myPetCardConfig !== 'string' ? {
    backgroundColor: hslToHex(myPetCardConfig.backgroundColor),
    color: hslToHex(myPetCardConfig.textColor),
  } : {};
  
  const pointsTrendCardConfig = cardConfig.pointsTrend;
  const pointsTrendCardStyle = pointsTrendCardConfig && typeof pointsTrendCardConfig !== 'string' ? {
    backgroundColor: hslToHex(pointsTrendCardConfig.backgroundColor),
    color: hslToHex(pointsTrendCardConfig.textColor),
  } : {};

  return (
    <div className="grid gap-6 animate-in fade-in-0 duration-500">
      <DailyReward />
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">你好, {currentStudent.name}!</h1>
          <p className="text-muted-foreground">歡迎回來！這是您今天的財務狀況概覽。</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
            cardKey="totalPoints"
            title={(cardConfig.totalPoints as any)?.title || '目前點數'}
            value={totalPoints.toLocaleString()}
            description={(cardConfig.totalPoints as any)?.description || '可用於交易或兌換獎勵'}
            icon={Coins}
        />
        <DashboardCard 
            cardKey="portfolioValue"
            title={(cardConfig.portfolioValue as any)?.title || '投資價值'}
            value={`$${Math.round(portfolioValue).toLocaleString()}`}
            description={(cardConfig.portfolioValue as any)?.description || '本月 +5.2%'}
            icon={BarChartIcon}
        />
         <DashboardCard 
            cardKey="fixedDeposits"
            title={(cardConfig.fixedDeposits as any)?.title || '定存點數'}
            value={Math.round(totalDepositAmount).toLocaleString()}
            description={(cardConfig.fixedDeposits as any)?.description || '目前進行中的定期存款'}
            icon={PiggyBank}
        />
        {totalLoanAmount > 0 && typeof cardConfig.totalAssets !== 'string' ? (
           <Card style={{ backgroundColor: '#dc2626', color: '#fef2f2' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="font-medium" style={{ fontSize: cardConfig.cardTitleSize || '0.875rem' }}>目前貸款</CardTitle>
                    <Landmark className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="font-bold" style={{ fontSize: cardConfig.cardValueSize || '1.5rem' }}>
                    {Math.round(totalLoanAmount).toLocaleString()}
                    </div>
                    <p className="text-xs" style={{ opacity: 0.9, fontSize: cardConfig.cardDescriptionSize || '0.75rem' }}>需在期限內償還</p>
                </CardContent>
            </Card>
        ) : (
            <DashboardCard 
                cardKey="totalAssets"
                title={(cardConfig.totalAssets as any)?.title || '總資產'}
                value={`$${Math.round(totalAssets).toLocaleString()}`}
                description={(cardConfig.totalAssets as any)?.description || '點數 + 投資 + 定存'}
                icon={Wallet}
            />
        )}
        <DashboardCard 
            cardKey="classRank"
            title={(cardConfig.classRank as any)?.title || '班級排名'}
            value={`#${classRank}`}
            description={((cardConfig.classRank as any)?.description || "班級前 {percentile}%").replace('{percentile}', String(100 - Math.floor(classPercentile)))}
            icon={Trophy}
        />
        <DashboardCard 
            cardKey="schoolRank"
            title={(cardConfig.schoolRank as any)?.title || '全校排名'}
            value={`#${schoolRank}`}
            description={((cardConfig.schoolRank as any)?.description || "全校前 {percentile}%").replace('{percentile}', String(100 - Math.floor(schoolPercentile)))}
            icon={Globe}
        />
        <DashboardCard 
            cardKey="myGroups"
            title={(cardConfig.myGroups as any)?.title || '我的分組'}
            value={studentGroups.length > 0 ? studentGroups.map(g=>g.groupName).join(', ') : 'N/A'}
            description={studentGroups.length > 0 ? `於 ${studentGroups.map(g=>g.teacherName).join(', ')} 的課堂中` : ((cardConfig.myGroups as any)?.description || '您尚未被分派到任何小組。')}
            icon={Users}
        />
        <DashboardCard 
            cardKey="buKeXingQiu"
            title={(cardConfig.buKeXingQiu as any)?.title || '布可星球'}
            value={`Lv. ${currentStudent.buKeLevel || 1}`}
            description={(cardConfig.buKeXingQiu as any)?.description || '你在閱讀世界中的榮譽等級'}
            icon={Star}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-2" style={myPetCardStyle}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{color: myPetCardStyle.color, fontSize: cardConfig.cardTitleSize}}><Bone /> {(cardConfig.myPet as any)?.title || '我的寵物'}</CardTitle>
                <CardDescription style={{color: myPetCardStyle.color, opacity: 0.8, fontSize: cardConfig.cardDescriptionSize}}>{(cardConfig.myPet as any)?.description || '您的點數越多，牠就會越強大！'}</CardDescription>
            </CardHeader>
            <CardContent>
                <StudentPet student={currentStudent} />
            </CardContent>
        </Card>
        <Card className="md:col-span-3" style={pointsTrendCardStyle}>
          <CardHeader>
            <CardTitle style={{color: pointsTrendCardStyle.color, fontSize: cardConfig.cardTitleSize}}>{(cardConfig.pointsTrend as any)?.title || '最近七日點數趨勢'}</CardTitle>
            <CardDescription style={{color: pointsTrendCardStyle.color, opacity: 0.8, fontSize: cardConfig.cardDescriptionSize}}>{(cardConfig.pointsTrend as any)?.description || '您最近七天每日從老師那裡獲得的點數紀錄。'}</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
                <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-[300px]">
                    <BarChart accessibilityLayer data={pointsData} margin={{ left: -20, right: 10, top:10, bottom: 0}}>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} stroke={pointsTrendCardStyle.color} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 'dataMax + 10']} hide />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="points" fill={platformConfig?.customTheme?.['accent'] ? hslToHex(platformConfig.customTheme['accent']) : 'hsl(var(--accent))'} radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
