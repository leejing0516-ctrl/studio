
"use client";

import { useState, useContext, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import type { Feedback } from "@/lib/types";
import { format }s from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TeacherFeedbackPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
        }
    }, [router, toast]);
    
    const feedbackList = useMemo(() => {
        return (platformConfig?.feedback || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [platformConfig]);

    const handleMarkAsRead = async (feedbackId: string) => {
        const updatedFeedback = feedbackList.map(f => 
            f.id === feedbackId ? { ...f, isRead: true } : f
        );
        try {
            await setPlatformConfig({ feedback: updatedFeedback });
        } catch (error) {
            toast({ title: "更新失敗", variant: "destructive" });
        }
    };
    
    const handleDeleteFeedback = async (feedbackId: string) => {
        const updatedFeedback = feedbackList.filter(f => f.id !== feedbackId);
        try {
            await setPlatformConfig({ feedback: updatedFeedback });
            toast({ title: "意見已刪除", variant: "destructive" });
        } catch (error) {
            toast({ title: "刪除失敗", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail /> 學生意見信箱</CardTitle>
                    <CardDescription>
                        這裡是所有學生提交的意見回饋。點擊每個項目以展開閱讀，並可將其標示為已讀或刪除。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {feedbackList.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {feedbackList.map(feedback => (
                                <AccordionItem value={feedback.id} key={feedback.id}>
                                    <AccordionTrigger 
                                        className="hover:no-underline"
                                        onClick={() => !feedback.isRead && handleMarkAsRead(feedback.id)}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-4 text-left">
                                                {!feedback.isRead && <Badge>新訊息</Badge>}
                                                <span className={feedback.isRead ? "font-normal" : "font-bold"}>
                                                    來自 {feedback.studentName} ({feedback.classId}) 的訊息
                                                </span>
                                            </div>
                                            <span className="text-sm text-muted-foreground font-normal pr-4">
                                                {format(new Date(feedback.date), "yyyy-MM-dd HH:mm")}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-muted/50 rounded-md">
                                            <p className="whitespace-pre-wrap">{feedback.message}</p>
                                            <div className="text-right mt-4">
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteFeedback(feedback.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    刪除此訊息
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>目前沒有任何學生意見。</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
