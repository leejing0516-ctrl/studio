

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
import { hslToHex, hexToHsl } from '@/lib/utils';

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
    const hexValue = hslToHex(value);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHexValue = e.target.value;
        const newHslValue = hexToHsl(newHexValue);
        if (newHslValue) {
            onChange(newHslValue);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Label htmlFor={`color-picker-${label}`} className="flex items-center gap-2 cursor-pointer">
                 <Input
                    id={`color-picker-${label}`}
                    type="color"
                    value={hexValue}
                    onChange={handleColorChange}
                    className="w-8 h-8 p-0 border-none rounded-md"
                />
                <span className="text-sm">{label}</span>
            </Label>
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
    colors: { bg: string, value: string, description: string, title: string },
    onTextChange: (key: CardFieldKeys, field: 'title' | 'description', value: string) => void,
    onColorChange: (key: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'card-title-foreground' | 'card-value-foreground' | 'card-description-foreground', value: string) => void,
}) => {
    const bgKey = `chart-${['totalPoints', 'portfolioValue', 'fixedDeposits', 'totalAssets', 'classRank'].indexOf(cardKey) + 1}` as 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';
    
    return (
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
             <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">背景顏色</h4>
                    <ColorPicker label="背景色" value={colors.bg} onChange={(v) => onColorChange(bgKey, v)} />
                </div>
                 <div className="space-y-3">
                    <h4 className="text-sm font-medium">文字顏色</h4>
                    <ColorPicker label="標題" value={colors.title} onChange={(v) => onColorChange('card-title-foreground', v)} />
                    <ColorPicker label="數值" value={colors.value} onChange={(v) => onColorChange('card-value-foreground', v)} />
                    <ColorPicker label="描述" value={colors.description} onChange={(v) => onColorChange('card-description-foreground', v)} />
                </div>
            </CardFooter>
        </Card>
    );
};

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
    
    const editorCardKeys: CardFieldKeys[] = [
        'totalPoints', 'portfolioValue', 'fixedDeposits', 'totalAssets', 'classRank', 'schoolRank', 'myGroups', 'buKeXingQiu'
    ];


    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>儀表板卡片編輯</CardTitle>
                    <CardDescription>
                        您可以在此自訂學生儀表板上所有資訊卡片的標題、說明文字與顏色。點擊色塊可開啟滴管工具。
                        <br/>
                        **注意**：部分說明文字包含 `{` `}` 符號（例如：{'{percentile}'}），這些是系統會自動替換的變數，請保留它們。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">頂部資訊卡 (4個)</h3>
                        <div className="flex flex-wrap gap-6">
                            <EditorCard 
                                cardKey="totalPoints" 
                                cardLabel="目前點數卡片" 
                                texts={cardTexts.totalPoints} 
                                colors={{bg: customTheme['chart-1'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any} 
                            />
                            <EditorCard 
                                cardKey="portfolioValue" 
                                cardLabel="投資價值卡片" 
                                texts={cardTexts.portfolioValue} 
                                colors={{bg: customTheme['chart-2'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any} 
                            />
                            <EditorCard 
                                cardKey="fixedDeposits" 
                                cardLabel="定存點數卡片" 
                                texts={cardTexts.fixedDeposits} 
                                colors={{bg: customTheme['chart-3'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any} 
                            />
                            <EditorCard 
                                cardKey="totalAssets" 
                                cardLabel="總資產/貸款卡片" 
                                texts={cardTexts.totalAssets} 
                                colors={{bg: customTheme['chart-4'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any} 
                            />
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">中間資訊卡 (4個)</h3>
                         <div className="flex flex-wrap gap-6">
                            <EditorCard 
                                cardKey="classRank" 
                                cardLabel="班級排名卡片" 
                                texts={cardTexts.classRank} 
                                colors={{bg: customTheme['chart-5'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any}
                            />
                             <EditorCard 
                                cardKey="schoolRank" 
                                cardLabel="全校排名卡片" 
                                texts={cardTexts.schoolRank} 
                                colors={{bg: customTheme['chart-5'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any}
                            />
                            <EditorCard 
                                cardKey="myGroups" 
                                cardLabel="我的分組卡片" 
                                texts={cardTexts.myGroups} 
                                colors={{bg: customTheme['chart-5'], title: customTheme['card-title-foreground'], value: customTheme['card-value-foreground'], description: customTheme['card-description-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={handleColorChange as any}
                            />
                             <Card className="flex-1 min-w-[320px] flex flex-col">
                                <CardHeader><CardTitle className="text-lg">布可星球卡片</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor={`title-buKeXingQiu`}>標題文字</Label>
                                        <Input id={`title-buKeXingQiu`} value={cardTexts.buKeXingQiu.title} onChange={(e) => handleTextChange('buKeXingQiu', 'title', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`desc-buKeXingQiu`}>說明文字</Label>
                                        <Textarea id={`desc-buKeXingQiu`} value={cardTexts.buKeXingQiu.description} onChange={(e) => handleTextChange('buKeXingQiu', 'description', e.target.value)} rows={2} />
                                    </div>
                                </CardContent>
                                <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium">顏色設定</h4>
                                        <ColorPicker label="背景色" value={customTheme['bu-ke-xing-qiu-card-background']} onChange={(v) => handleColorChange('bu-ke-xing-qiu-card-background', v)} />
                                        <ColorPicker label="文字顏色" value={customTheme['bu-ke-xing-qiu-card-foreground']} onChange={(v) => handleColorChange('bu-ke-xing-qiu-card-foreground', v)} />
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    </section>

                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">底部資訊卡 (2個)</h3>
                        <div className="flex flex-wrap gap-6">
                            <Card className="flex-1 min-w-[320px] flex flex-col">
                                <CardHeader><CardTitle className="text-lg">我的寵物卡片</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor={`title-myPet`}>標題文字</Label>
                                        <Input id={`title-myPet`} value={cardTexts.myPet.title} onChange={(e) => handleTextChange('myPet', 'title', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`desc-myPet`}>說明文字</Label>
                                        <Textarea id={`desc-myPet`} value={cardTexts.myPet.description} onChange={(e) => handleTextChange('myPet', 'description', e.target.value)} rows={2} />
                                    </div>
                                </CardContent>
                                <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium">顏色設定</h4>
                                        <ColorPicker label="背景色" value={customTheme['my-pet-card-background']} onChange={(v) => handleColorChange('my-pet-card-background', v)} />
                                        <ColorPicker label="文字顏色" value={customTheme['my-pet-card-foreground']} onChange={(v) => handleColorChange('my-pet-card-foreground', v)} />
                                    </div>
                                </CardFooter>
                            </Card>
                            <Card className="flex-1 min-w-[320px] flex flex-col">
                                <CardHeader><CardTitle className="text-lg">點數趨勢卡片</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor={`title-pointsTrend`}>標題文字</Label>
                                        <Input id={`title-pointsTrend`} value={cardTexts.pointsTrend.title} onChange={(e) => handleTextChange('pointsTrend', 'title', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`desc-pointsTrend`}>說明文字</Label>
                                        <Textarea id={`desc-pointsTrend`} value={cardTexts.pointsTrend.description} onChange={(e) => handleTextChange('pointsTrend', 'description', e.target.value)} rows={2} />
                                    </div>
                                </CardContent>
                                <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
                                     <div className="space-y-3">
                                        <h4 className="text-sm font-medium">顏色設定</h4>
                                        <ColorPicker label="背景色" value={customTheme['points-trend-card-background']} onChange={(v) => handleColorChange('points-trend-card-background', v)} />
                                        <ColorPicker label="文字顏色" value={customTheme['points-trend-card-foreground']} onChange={(v) => handleColorChange('points-trend-card-foreground', v)} />
                                    </div>
                                </CardFooter>
                            </Card>
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
