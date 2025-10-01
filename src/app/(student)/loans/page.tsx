
"use client";

import { useState, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { Calendar as CalendarIcon, Landmark, AlertTriangle, CheckCircle, Hourglass, Info } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import type { Loan, Teacher, PlatformConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const LOAN_LIMIT = 500;

export default function LoansPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents, platformConfig, setPlatformConfig, teachers, setTeachers } = useContext(AppDataContext);
  const { toast } = useToast();

  const [loanAmount, setLoanAmount] = useState<number | "">(100);
  const [loanReason, setLoanReason] = useState("");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [isConfirmRepayOpen, setIsConfirmRepayOpen] = useState(false);
  const [loanToRepay, setLoanToRepay] = useState<Loan | null>(null);

  const currentStudent = useMemo(() => 
    students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId) || studentData.student
  , [students, studentData.student]);
  
  const activeLoan = useMemo(() => currentStudent?.loans?.find(l => l.status === 'active' || l.status === 'overdue'), [currentStudent]);
  const pendingLoan = useMemo(() => currentStudent?.loans?.find(l => l.status === 'pending'), [currentStudent]);
  const loanInterestRate = platformConfig?.loanInterestRate || 0.005; // Default 0.5% daily interest

  const handleLoanRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentDate || !currentStudent || !loanAmount) return;
    if (loanAmount <= 0 || loanAmount > LOAN_LIMIT) {
        toast({ title: "無效的金額", description: `貸款金額必須介於 1 至 ${LOAN_LIMIT.toLocaleString()} 之間。`, variant: "destructive" });
        return;
    }
    if (!loanReason) {
        toast({ title: "缺少理由", description: "請填寫您的貸款理由。", variant: "destructive" });
        return;
    }

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      amount: loanAmount,
      reason: loanReason,
      requestDate: new Date().toISOString(),
      repaymentDate: startOfDay(repaymentDate).toISOString(),
      status: 'pending',
      interestRate: loanInterestRate,
      interest: 0,
    };

    setStudents(currentStudents => currentStudents.map(s => {
      if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
        return { ...s, loans: [...(s.loans || []), newLoan] };
      }
      return s;
    }));

    toast({ title: "申請已送出", description: "您的貸款申請已送出給老師審核。" });
    setLoanAmount(100);
    setLoanReason("");
    setRepaymentDate(addDays(new Date(), 7));
  };
  
  const handleRepayClick = (loan: Loan) => {
    setLoanToRepay(loan);
    setIsConfirmRepayOpen(true);
  };
  
  const handleConfirmRepay = () => {
    if (!loanToRepay || !currentStudent) return;
    
    const totalRepayment = Math.ceil(loanToRepay.amount + loanToRepay.interest);
    if (currentStudent.points < totalRepayment) {
        toast({ title: "點數不足", description: `您需要 ${totalRepayment.toLocaleString()} 點來償還此筆貸款。`, variant: "destructive" });
        setIsConfirmRepayOpen(false);
        return;
    }

    // Repay points to the approver
    if (loanToRepay.approverId) {
      if (loanToRepay.approverId === 'principal') {
          setPlatformConfig({ schoolFunds: (platformConfig?.schoolFunds || 0) + totalRepayment });
      } else {
          setTeachers(currentTeachers => currentTeachers.map(t => 
              t.id === loanToRepay.approverId ? { ...t, pointBalance: (t.pointBalance || 0) + totalRepayment } : t
          ));
      }
    }
    
    // Update student's state
    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
            return {
                ...s,
                points: s.points - totalRepayment,
                loans: s.loans.map(l => l.id === loanToRepay.id ? { ...l, status: 'repaid' as const } : l)
            };
        }
        return s;
    }));

    toast({ title: "還款成功！", description: `您已成功償還 ${totalRepayment.toLocaleString()} 點。` });
    setIsConfirmRepayOpen(false);
    setLoanToRepay(null);
  };


  const renderLoanStatus = () => {
    if (pendingLoan) {
      return (
        <Card className="text-center p-12 bg-amber-50 border-amber-200">
            <Hourglass className="mx-auto h-12 w-12 text-amber-500" />
            <CardTitle className="mt-4 text-amber-800">貸款審核中</CardTitle>
            <CardDescription className="mt-2 text-amber-700">
                您有一筆 {pendingLoan.amount.toLocaleString()} 點的貸款正在等待老師批准。
            </CardDescription>
        </Card>
      );
    }
    if (activeLoan) {
        const totalRepayment = Math.ceil(activeLoan.amount + activeLoan.interest);
        const isOverdue = activeLoan.status === 'overdue';
      return (
        <Card className={cn("overflow-hidden", isOverdue && "border-red-500 bg-red-500/5")}>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isOverdue && "text-red-500")}>
              <Landmark/>
              進行中的貸款
            </CardTitle>
            <CardDescription>
                您目前有一筆進行中的貸款。請務必在期限内還款以維持良好信用。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">貸款金額</p><p className="font-bold text-lg">{activeLoan.amount.toLocaleString()} 點</p></div>
                  <div><p className="text-muted-foreground">累積利息 ({(activeLoan.interestRate * 100).toFixed(2)}%日利率)</p><p className="font-bold text-lg">{Math.floor(activeLoan.interest).toLocaleString()} 點</p></div>
                  <div><p className="text.muted-foreground">批准日期</p><p>{activeLoan.approvalDate ? format(new Date(activeLoan.approvalDate), 'yyyy-MM-dd') : 'N/A'}</p></div>
                  <div><p className="text.muted-foreground">還款期限</p><p className={cn(isOverdue && "font-bold text-red-500")}>{format(new Date(activeLoan.repaymentDate), 'yyyy-MM-dd')}</p></div>
              </div>
              <CardFooter className="p-0 pt-4">
                   <div className="w-full bg-muted/80 p-4 rounded-lg text-center">
                        <p className="text-muted-foreground">總還款金額</p>
                        <p className="text-3xl font-bold text-primary">{totalRepayment.toLocaleString()} <span className="text-lg font-medium">點</span></p>
                   </div>
              </CardFooter>
               {isOverdue && (
                  <div className="flex items-center text-sm text-red-500 gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>您的貸款已逾期！將會影響您的信用。</span>
                  </div>
              )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleRepayClick(activeLoan)}>
                立即還款
            </Button>
          </CardFooter>
        </Card>
      );
    }
    return (
        <Card>
            <form onSubmit={handleLoanRequest}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark/> 信用貸款申請</CardTitle>
                    <CardDescription>需要點數應急嗎？您可以申請最高 {LOAN_LIMIT.toLocaleString()} 點的短期貸款。目前的日利率為 {(loanInterestRate * 100).toFixed(2)}%。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">貸款金額 (上限 {LOAN_LIMIT.toLocaleString()} 點)</Label>
                        <Input id="amount" type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))} max={LOAN_LIMIT} min="1" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reason">貸款理由</Label>
                        <Textarea id="reason" placeholder="例如：我想買進「學習公司」的股票..." value={loanReason} onChange={e => setLoanReason(e.target.value)} required/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="repayment-date">還款期限</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !repaymentDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {repaymentDate ? format(repaymentDate, "PPP") : <span>選擇一個日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={repaymentDate}
                                onSelect={setRepaymentDate}
                                disabled={(date) => date < addDays(new Date(), 1) || date > addDays(new Date(), 30)}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                     </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" type="submit">送出申請</Button>
                </CardFooter>
            </form>
        </Card>
    );
  };
  
  const renderLoanHistory = () => {
    const historicalLoans = currentStudent?.loans?.filter(l => l.status === 'repaid' || l.status === 'rejected') || [];
    if (historicalLoans.length === 0) return null;

    return (
         <Card>
            <CardHeader>
                <CardTitle>貸款歷史紀錄</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {historicalLoans.map(loan => (
                        <div key={loan.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                                <p className="font-semibold">
                                    {loan.status === 'repaid' ? `已償還 ${Math.ceil(loan.amount + loan.interest).toLocaleString()} 點` : `已拒絕 ${loan.amount.toLocaleString()} 點`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    申請日期: {format(new Date(loan.requestDate), 'yyyy-MM-dd')}
                                </p>
                            </div>
                             <Badge variant={loan.status === 'repaid' ? 'default' : 'destructive'}>
                                {loan.status === 'repaid' ? '已還款' : '已拒絕'}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-in fade-in-0 duration-500">
      <div>
        {renderLoanStatus()}
      </div>
      <div>
        {renderLoanHistory()}
      </div>

       <AlertDialog open={isConfirmRepayOpen} onOpenChange={setIsConfirmRepayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認還款？</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要花費 {Math.ceil((loanToRepay?.amount || 0) + (loanToRepay?.interest || 0)).toLocaleString()} 點來償還此筆貸款嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoanToRepay(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRepay}>確定還款</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
