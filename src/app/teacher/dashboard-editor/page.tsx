
"use client";

import { useState, useContext, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";

const cardFields = {
    classRank: { title: "班級排名", description: "班級前 {percentile}%" },
    schoolRank: { title: "全校排名", description: "全校前 {percentile}%" },
    myGroups: { title: "我的分組", description: "您尚未被分派到任何小組。" },
    myPet: { title: "我的寵物", description: "您的點數越多，牠就會越強大！" },
    pointsTrend: { title: "最近七日點數趨勢", description: "您最近七天每日從老師那裡獲得的點數紀錄。" },
    totalPoints: { title: "目前點數", description: "可用於交易或兌換獎勵" },
    portfolioValue: { title: "投資價值", description: "本月 +5.2%" },
    fixedDeposits: { title: "定存點數", description: "目前進行中的定期存款" },
    totalAssets: { title: "總資產", description: "點數 + 投資 + 定存" },
    currentLoan: { title: "目前貸款", description: "需在期限內償還" },
};


export default function TeacherDashboardEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [cardTexts, setCardTexts] = useState<typeof cardFields>({} as typeof cardFields);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig?.dashboardCards) {
            const newCardTexts: any = {};
            for (const key in cardFields) {
                newCardTexts[key] = {
                    title: platformConfig.dashboardCards[key as keyof typeof cardFields]?.title || cardFields[key as keyof typeof cardFields].title,
                    description: platformConfig.dashboardCards[key as keyof typeof cardFields]?.description || cardFields[key as keyof typeof cardFields].description,
                };
            }
            setCardTexts(newCardTexts);
        } else {
             setCardTexts(cardFields);
        }
    }, [platformConfig, router, toast]);

    const handleTextChange = (cardKey: keyof typeof cardFields, field: 'title' | 'description', value: string) => {
        setCardTexts(prev => ({
            ...prev,
            [cardKey]: {
                ...prev[cardKey],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setPlatformConfig({ dashboardCards: cardTexts });
            toast({ title: "儲存成功", description: "儀表板卡片文字已更新。" });
        } catch (error: any) {
            console.error("Error saving dashboard card texts:", error);
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>儀表板卡片文字編輯</CardTitle>
                    <CardDescription>
                        您可以在此自訂學生儀表板上所有資訊卡片的標題與說明文字。
                        <br/>
                        **注意**：部分說明文字包含 `{` `}` 符號（例如：{'{percentile}'}），這些是系統會自動替換的變數，請保留它們。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(cardTexts).map(([key, value]) => (
                        <Card key={key} className="p-4 bg-muted/50">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`title-${key}`}>標題文字</Label>
                                    <Input 
                                        id={`title-${key}`}
                                        value={value.title}
                                        onChange={(e) => handleTextChange(key as keyof typeof cardFields, 'title', e.target.value)}
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor={`desc-${key}`}>說明文字</Label>
                                    <Textarea 
                                        id={`desc-${key}`}
                                        value={value.description}
                                        onChange={(e) => handleTextChange(key as keyof typeof cardFields, 'description', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                             </div>
                        </Card>
                    ))}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        儲存文字內容
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
