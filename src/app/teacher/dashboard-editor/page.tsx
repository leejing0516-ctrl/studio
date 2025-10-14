

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
import type { CustomTheme } from "@/lib/types";

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

const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) => {
    const isValidHsl = /^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/.test(value);
    return (
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${value})` }} />
            <div className="flex-1">
                <Label className="text-xs">{label}</Label>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-8 text-xs ${!isValidHsl ? 'border-red-500' : ''}`}
                    placeholder="e.g., 222 47% 11%"
                />
            </div>
        </div>
    );
};


const EditorCard = ({ 
    cardKey, 
    cardLabel, 
    texts, 
    colors,
    onTextChange,
    onColorChange,
}: { 
    cardKey: CardFieldKeys, 
    cardLabel: string, 
    texts: {title: string, description: string}, 
    colors: { bg: string, value: string, description: string },
    onTextChange: (key: CardFieldKeys, field: 'title' | 'description', value: string) => void,
    onColorChange: (key: 'card-value-foreground' | 'card-description-foreground' | 'bu-ke-xing-qiu-card-background' | 'my-pet-card-background' | 'points-trend-card-background', value: string) => void,
}) => (
    <Card className="flex-1 min-w-[320px] flex flex-col">
        <CardHeader>
            <CardTitle className="text-lg">{cardLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor={`title-${cardKey}`}>標題文字</Label>
                <Input 
                    id={`title-${cardKey}`}
                    value={texts.title}
                    onChange={(e) => onTextChange(cardKey, 'title', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`desc-${cardKey}`}>說明文字</Label>
                <Textarea 
                    id={`desc-${cardKey}`}
                    value={texts.description}
                    onChange={(e) => onTextChange(cardKey, 'description', e.target.value)}
                    rows={2}
                />
            </div>
        </CardContent>
        <CardFooter className="mt-auto grid grid-cols-2 gap-4 pt-4">
            <ColorPicker label="數值顏色" value={colors.value} onChange={(v) => onColorChange('card-value-foreground', v)} />
            <ColorPicker label="描述顏色" value={colors.description} onChange={(v) => onColorChange('card-description-foreground', v)} />
        </CardFooter>
    </Card>
);

export default function TeacherDashboardEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [cardTexts, setCardTexts] = useState(initialCardFields);
    const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig) {
             setCardTexts(platformConfig.dashboardCards || initialCardFields);
             if (platformConfig.customTheme) {
                setCustomTheme(platformConfig.customTheme);
             }
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
    
    const handleColorChange = (key: keyof CustomTheme, value: string) => {
        setCustomTheme(prev => ({
            ...(prev as CustomTheme),
            [key]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setPlatformConfig({ 
                dashboardCards: cardTexts,
                customTheme: customTheme || undefined
            });
            toast({ title: "儲存成功", description: "儀表板卡片設定已更新。" });
        } catch (error: any) {
            console.error("Error saving dashboard settings:", error);
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!customTheme) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>儀表板卡片編輯</CardTitle>
                    <CardDescription>
                        您可以在此自訂學生儀表板上所有資訊卡片的標題、說明文字與顏色。
                        <br/>
                        **注意**：部分說明文字包含 `{` `}` 符號（例如：{'{percentile}'}），這些是系統會自動替換的變數，請保留它們。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">頂部資訊卡 (4個)</h3>
                        <div className="flex flex-wrap gap-6">
                            <EditorCard cardKey="totalPoints" cardLabel="目前點數卡片" texts={cardTexts.totalPoints} colors={{bg: customTheme['chart-1'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="portfolioValue" cardLabel="投資價值卡片" texts={cardTexts.portfolioValue} colors={{bg: customTheme['chart-2'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="fixedDeposits" cardLabel="定存點數卡片" texts={cardTexts.fixedDeposits} colors={{bg: customTheme['chart-3'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="totalAssets" cardLabel="總資產/目前貸款卡片" texts={cardTexts.totalAssets} colors={{bg: customTheme['chart-4'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">中間資訊卡 (4個)</h3>
                         <div className="flex flex-wrap gap-6">
                            <EditorCard cardKey="classRank" cardLabel="班級排名卡片" texts={cardTexts.classRank} colors={{bg: customTheme['chart-5'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="schoolRank" cardLabel="全校排名卡片" texts={cardTexts.schoolRank} colors={{bg: customTheme['chart-5'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="myGroups" cardLabel="我的分組卡片" texts={cardTexts.myGroups} colors={{bg: customTheme['chart-5'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                            <EditorCard cardKey="buKeXingQiu" cardLabel="布可星球卡片" texts={cardTexts.buKeXingQiu} colors={{bg: customTheme['bu-ke-xing-qiu-card-background'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                        </div>
                    </section>

                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">底部資訊卡 (2個)</h3>
                        <div className="flex flex-wrap gap-6">
                           <EditorCard cardKey="myPet" cardLabel="我的寵物卡片" texts={cardTexts.myPet} colors={{bg: customTheme['my-pet-card-background'], value: customTheme['my-pet-card-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
                           <EditorCard cardKey="pointsTrend" cardLabel="點數趨勢卡片" texts={cardTexts.pointsTrend} colors={{bg: customTheme['points-trend-card-background'], value: customTheme['points-trend-card-foreground'], description: customTheme['card-description-foreground']}} onTextChange={handleTextChange} onColorChange={handleColorChange} />
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
