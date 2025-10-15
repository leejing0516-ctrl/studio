
"use client";

import { useState, useContext } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { AppDataContext } from "@/context/AppDataContext";
import { Mail, Send, Loader2 } from "lucide-react";
import type { Feedback } from "@/lib/types";

export default function FeedbackPage() {
  const { student } = useAuth();
  const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
  const { toast } = useToast();
  
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !message.trim()) {
        toast({ title: "請輸入您的意見", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);

    const newFeedback: Feedback = {
        id: `feedback-${Date.now()}-${Math.random()}`,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        message: message,
        date: new Date().toISOString(),
        isRead: false,
    };

    try {
        await setPlatformConfig({
            feedback: [...(platformConfig?.feedback || []), newFeedback],
        });
        toast({ title: "意見已成功送出！", description: "感謝您的寶貴意見，校長將會看到您的訊息。" });
        setMessage("");
    } catch (error: any) {
        console.error("Failed to submit feedback:", error);
        toast({ title: "傳送失敗", description: error.message || "發生未知錯誤，請稍後再試。", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in-0 duration-500 max-w-2xl mx-auto">
      <form onSubmit={handleSubmitFeedback}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail />
              意見信箱
            </CardTitle>
            <CardDescription>
              有什麼話想對校長說嗎？無論是建議、問題還是純粹想分享你的想法，都歡迎在這裡留言。你的聲音對我們很重要！
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="message">你的訊息</Label>
              <Textarea
                placeholder="在這裡寫下你想說的話..."
                id="message"
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "傳送中..." : "送出意見"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
