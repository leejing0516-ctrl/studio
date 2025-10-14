
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

const initialCardFields = {
    totalPoints: { title: "目前點數", description: "可用於交易或兌換獎勵" },
    portfolioValue: { title: "投資價值", description: "謹慎理財，信用至上" },
    fixedDeposits: { title: "定存點數", description: "目前進行中的定期存款" },
    totalAssets: { title: "總資產", description: "點數 + 投資 + 定存" },
    classRank: { title: "班級排名", description: "班級前 {percentile}%" },
    schoolRank: { title: "全校排名", description: "全校前 {percentile}%" },
    myGroups: { title: "我的分組", description: "您尚未被分派到任何小組。" },
    buKeXingQiu: { title: "布可星球", description: "你在閱讀世界中的榮譽等級" },
    myPet: { title: "我的寵物", description: "您的點數越多，牠就會越強大！" },
    pointsTrend: { title: "最近七日點數趨勢", description: "您最近七天每日從老師那裡獲得的點數紀錄。" },
    currentLoan: { title: "目前貸款", description: "需在期限內償還" },
};

type CardFieldKeys = keyof typeof initialCardFields;


const EditorCard = ({ cardKey, cardLabel, texts, onChange }: { cardKey: CardFieldKeys, cardLabel: string, texts: {title: string, description: string}, onChange: (key: CardFieldKeys, field: 'title' | 'description', value: string) => void }) => (
    <Card className="flex-1 min-w-[280px]">
        <CardHeader>
            <CardTitle className="text-lg">{cardLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor={`title-${cardKey}`}>標題文字</Label>
                <Input 
                    id={`title-${cardKey}`}
                    value={texts.title}
                    onChange={(e) => onChange(cardKey, 'title', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`desc-${cardKey}`}>說明文字</Label>
                <Textarea 
                    id={`desc-${cardKey}`}
                    value={texts.description}
                    onChange={(e) => onChange(cardKey, 'description', e.target.value)}
                    rows={2}
                />
            </div>
        </CardContent>
    </Card>
);

export default function TeacherDashboardEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [cardTexts, setCardTexts] = useState(initialCardFields);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig?.dashboardCards) {
            const newCardTexts: any = {};
            for (const key in initialCardFields) {
                newCardTexts[key as CardFieldKeys] = {
                    title: platformConfig.dashboardCards[key as CardFieldKeys]?.title || initialCardFields[key as CardFieldKeys].title,
                    description: platformConfig.dashboardCards[key as CardFieldKeys]?.description || initialCardFields[key as CardFieldKeys].description,
                };
            }
            setCardTexts(newCardTexts);
        } else {
             setCardTexts(initialCardFields);
        }
    }, [platformConfig, router, toast]);

    const handleTextChange = (cardKey: CardFieldKeys, field: 'title' | 'description', value: string) => {
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
                <CardContent className="space-y-8">
                    {/* Top Row Cards */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">頂部資訊卡 (4個)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <EditorCard cardKey="totalPoints" cardLabel="目前點數卡片" texts={cardTexts.totalPoints} onChange={handleTextChange} />
                            <EditorCard cardKey="portfolioValue" cardLabel="投資價值卡片" texts={cardTexts.portfolioValue} onChange={handleTextChange} />
                            <EditorCard cardKey="fixedDeposits" cardLabel="定存點數卡片" texts={cardTexts.fixedDeposits} onChange={handleTextChange} />
                            <EditorCard cardKey="totalAssets" cardLabel="總資產/目前貸款卡片" texts={cardTexts.totalAssets} onChange={handleTextChange} />
                        </div>
                    </section>
                    
                    {/* Middle Row Cards */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">中間資訊卡 (4個)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <EditorCard cardKey="classRank" cardLabel="班級排名卡片" texts={cardTexts.classRank} onChange={handleTextChange} />
                            <EditorCard cardKey="schoolRank" cardLabel="全校排名卡片" texts={cardTexts.schoolRank} onChange={handleTextChange} />
                            <EditorCard cardKey="myGroups" cardLabel="我的分組卡片" texts={cardTexts.myGroups} onChange={handleTextChange} />
                            <EditorCard cardKey="buKeXingQiu" cardLabel="布可星球卡片" texts={cardTexts.buKeXingQiu} onChange={handleTextChange} />
                        </div>
                    </section>

                    {/* Bottom Row Cards */}
                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">底部資訊卡 (2個)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <EditorCard cardKey="myPet" cardLabel="我的寵物卡片" texts={cardTexts.myPet} onChange={handleTextChange} />
                           <EditorCard cardKey="pointsTrend" cardLabel="點數趨勢卡片" texts={cardTexts.pointsTrend} onChange={handleTextChange} />
                        </div>
                    </section>
                </CardContent>
                <CardFooter className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur-sm py-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        儲存所有變更
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
