
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudDownload, CloudUpload, History, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function TeacherBackupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
        }
    }, [router, toast]);
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>資料備份與還原</CardTitle>
                    <CardDescription>
                        此功能即將推出。未來您將可以在這裡手動備份全校的所有資料，或從過去的備份中還原系統狀態。
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center p-12 text-muted-foreground">
                    <p>功能開發中，敬請期待！</p>
                </CardContent>
            </Card>
        </div>
    );
}
