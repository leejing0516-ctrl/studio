
"use client";

import { useState, useContext, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PiggyBank, Banknote, CalendarClock, ChevronsRight, BadgePercent, ShieldCheck } from "lucide-react";
import { addDays, format, isAfter, startOfDay } from "date-fns";
import type { FixedDeposit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const depositDurations = [
  { value: 7, label: "7 天" },
  { value: 14, label: "14 天" },
  { value: 30, label: "30 天" },
];

export default function DepositsPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents, platformConfig } = useContext(AppDataContext);
  const { toast } = useToast();

  const [amount, setAmount] = useState<number | "">("");
  const [duration, setDuration] = useState<number>(7);
  
  const currentStudent = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId);
  const interestRate = platformConfig?.fixedDepositInterestRate || 0.01;

  const activeDeposits = useMemo(() => {
    return (currentStudent?.fixedDeposits || []).filter(d => d.status === 'active');
  }, [currentStudent]);

  const maturedDeposits = useMemo(() => {
    return (currentStudent?.fixedDeposits || []).filter(d => d.status === 'matured');
  }, [currentStudent]);

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !amount) return;

    if (amount <= 0) {
        toast({ title: "金額無效", description: "存款金額必須大於 0。", variant: "destructive" });
        return;
    }
    if (amount % 100 !== 0) {
        toast({ title: "金額錯誤", description: "存款金額必須是 100 的倍數。", variant: "destructive" });
        return;
    }
    if (currentStudent.points < amount) {
        toast({ title: "點數不足", description: `您的點數不足 ${amount.toLocaleString()} 點。`, variant: "destructive" });
        return;
    }

    const startDate = new Date();
    const newDeposit: FixedDeposit = {
        id: `dep-${Date.now()}`,
        amount: amount,
        startDate: startDate.toISOString(),
        maturityDate: addDays(startDate, duration).toISOString(),
        status: 'active',
        interestRate: interestRate,
        interestEarned: 0,
    };
    
    await setStudents(prevStudents => prevStudents.map(s => {
        if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
            return {
                ...s,
                points: s.points - amount,
                fixedDeposits: [...(s.fixedDeposits || []), newDeposit],
            };
        }
        return s;
    }));

    toast({ title: "定存已建立！", description: `您已成功存入 ${amount.toLocaleString()} 點，為期 ${duration} 天。`});
    setAmount("");
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-in fade-in-0 duration-500">
      <Card>
        <form onSubmit={handleCreateDeposit}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PiggyBank /> 建立新的定期存款</CardTitle>
                <CardDescription>
                    將您的點數存入定存，賺取利息！目前的每日利率為 {(interestRate * 100).toFixed(2)}%。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">存款金額 (以 100 為單位)</Label>
                    <Input 
                        id="amount" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                        placeholder="例如：500"
                        step="100"
                        min="100"
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="duration">存款天期</Label>
                    <Select onValueChange={(value) => setDuration(Number(value))} defaultValue={String(duration)}>
                        <SelectTrigger id="duration">
                            <SelectValue placeholder="選擇存款天數" />
                        </SelectTrigger>
                        <SelectContent>
                            {depositDurations.map(d => (
                                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {amount && (
                    <Card className="bg-muted/50 p-4 text-sm">
                         <CardDescription>預估收益</CardDescription>
                         <p className="font-semibold">
                           到期後，您預計可獲得 <span className="text-primary font-bold">{Math.floor(amount * interestRate * duration).toLocaleString()}</span> 點利息。
                         </p>
                    </Card>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full" type="submit">確認存入</Button>
            </CardFooter>
        </form>
      </Card>
       <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarClock /> 進行中的定存</CardTitle>
            </CardHeader>
            <CardContent>
                {activeDeposits.length > 0 ? (
                    <div className="space-y-3">
                        {activeDeposits.map(d => (
                             <div key={d.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-lg text-primary">{d.amount.toLocaleString()} <span className="text-sm font-normal text-foreground">點</span></p>
                                    <p className="text-xs text-muted-foreground">到期日: {format(new Date(d.maturityDate), 'yyyy-MM-dd')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">+{Math.floor(d.interestEarned).toLocaleString()} <span className="text-sm font-normal">利息</span></p>
                                    <p className="text-xs text-muted-foreground">日利率 {(d.interestRate * 100).toFixed(2)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">目前沒有進行中的定存。</p>
                )}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck /> 已到期/已結算紀錄</CardTitle>
            </CardHeader>
            <CardContent>
                {maturedDeposits.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {maturedDeposits.map(d => (
                            <div key={d.id} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between opacity-70">
                                <div>
                                    <p className="font-bold">{d.amount.toLocaleString()} <span className="text-sm font-normal">點</span></p>
                                    <p className="text-xs text-muted-foreground">結算於: {format(new Date(d.maturityDate), 'yyyy-MM-dd')}</p>
                                </div>
                                <p className="font-semibold text-green-600">+{Math.floor(d.interestEarned).toLocaleString()} 利息</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">目前沒有已到期的定存紀錄。</p>
                )}
            </CardContent>
        </Card>
       </div>
    </div>
  );
}
