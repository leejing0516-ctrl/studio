
"use client";

import { useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentDataContext } from "@/context/StudentDataContext";
import { BookUp, Library, Star, TrendingUp, Gem, ExternalLink } from "lucide-react";
import { AppDataContext } from "@/context/AppDataContext";

const StatCard = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) => (
  <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default function BuKeXingQiuPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, platformConfig } = useContext(AppDataContext);

  const currentStudent = students.find(
    (s) =>
      s.id === studentData.student?.id &&
      s.classId === studentData.student.classId
  );

  if (!currentStudent) {
    return <div>載入中...</div>;
  }

  const month = currentStudent.buKeMonth;

  const defaultDescription = "「布可星球」是你閱讀成就的殿堂！你在這裡挖掘的每一點能量、每一本書，都是你知識宇宙擴張的證明。\n每個月底，校長會將你「本月挖掘的能量」按照一定的比例，轉換成可以在平台中使用的「點數」，作為對你努力閱讀的實質獎勵。繼續閱讀，讓你的星球更加璀璨吧！";
  const buKeDescription = platformConfig?.buKeXingQiuDescription || defaultDescription;

  return (
    <div className="animate-in fade-in-0 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left">
            <div className="relative h-20 w-80 mb-2">
                <Image
                    src="https://i.imgur.com/gZ5oM2w.png"
                    alt="布可星球 Logo"
                    fill
                    className="object-contain"
                />
            </div>
            <h1 className="text-3xl font-bold">我的布可星球成就</h1>
            <p className="text-muted-foreground">你在閱讀世界中探索的足跡與榮譽。</p>
        </div>
        <Link href="https://read.tn.edu.tw/" target="_blank" rel="noopener noreferrer">
            <Button>
                <ExternalLink className="mr-2 h-4 w-4" />
                前往布可星球網站
            </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={month ? `${month}月份挖掘能量` : "本月挖掘能量"}
          value={currentStudent.buKeEnergyThisMonth?.toLocaleString() || 0}
          icon={Gem}
        />
        <StatCard
          title={month ? `${month}月份挖掘本數` : "本月挖掘本數"}
          value={currentStudent.buKeBooksThisMonth?.toLocaleString() || 0}
          icon={BookUp}
        />
        <StatCard
          title="等級"
          value={`Lv. ${currentStudent.buKeLevel || 1}`}
          icon={Star}
        />
        <StatCard
          title="累計挖掘總能量"
          value={currentStudent.buKeTotalEnergy?.toLocaleString() || 0}
          icon={TrendingUp}
        />
        <StatCard
          title="挖掘總本數"
          value={currentStudent.buKeTotalBooks?.toLocaleString() || 0}
          icon={Library}
        />
      </div>
       <Card>
        <CardHeader>
          <CardTitle>關於布可星球</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 whitespace-pre-wrap">
          <p>{buKeDescription}</p>
        </CardContent>
      </Card>
    </div>
  );
}
