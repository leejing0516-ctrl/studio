
"use client";

import React, { useState, useContext, useEffect } from "react";
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
import { Loader2, Coins, BarChart, PiggyBank, Wallet, Trophy, Globe, Users, Star, Bone, LineChart } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardCardConfig } from "@/lib/types";
import { hslToHex, hexToHsl } from '@/lib/utils';

const initialCardConfig: Partial<DashboardCardConfig> = {
    totalPoints: { title: "目前點數", description: "可用於交易或兌換獎勵", backgroundColor: "222.2 47.4% 11.2%", textColor: "210 40% 98%" },
    portfolioValue: { title: "投資價值", description: "謹慎理財，信用至上", backgroundColor: "210 40% 96.1%", textColor: "222.2 47.4% 11.2%" },
    fixedDeposits: { title: "定存點數", description: "目前進行中的定期存款", backgroundColor: "217.2 91.2% 59.8%", textColor: "210 40% 98%" },
    totalAssets: { title: "總資產", description: "點數 + 投資 + 定存", backgroundColor: "215.4 16.3% 46.9%", textColor: "210 40% 98%" },
    classRank: { title: "班級排名", description: "班級前 {percentile}%", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    schoolRank: { title: "全校排名", description: "全校前 {percentile}%", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    myGroups: { title: "我的分組", description: "您尚未被分派到任何小組。", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    buKeXingQiu: { title: "布可星球", description: "你在閱讀世界中的榮譽等級", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    myPet: { title: "我的寵物", description: "您的點數越多，牠就會越強大！", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    pointsTrend: { title: "最近七日點數趨勢", description: "您最近七天每日從老師那裡獲得的點數紀錄。", backgroundColor: "220 20% 70%", textColor: "220 20% 10%" },
    cardTitleSize: "0.875rem",
    cardValueSize: "1.5rem",
    cardDescriptionSize: "0.75rem",
};

type CardFieldKeys = 'totalPoints' | 'portfolioValue' | 'fixedDeposits' | 'totalAssets' | 'classRank' | 'schoolRank' | 'myGroups' | 'buKeXingQiu' | 'myPet' | 'pointsTrend';


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
            <Label htmlFor={`color-picker-${label.replace(/\s+/g, '-')}`} className="flex items-center gap-2 cursor-pointer">
                 <Input
                    id={`color-picker-${label.replace(/\s+/g, '-')}`}
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
    cardConfig,
    onTextChange,
    onColorChange,
    icon: Icon,
    fontSizes
}: { 
    cardKey: CardFieldKeys, 
    cardLabel: string, 
    cardConfig: DashboardCardConfig[CardFieldKeys],
    onTextChange: (key: CardFieldKeys, field: 'title' | 'description', value: string) => void,
    onColorChange: (key: CardFieldKeys, field: 'backgroundColor' | 'textColor', value: string) => void,
    icon: React.ElementType,
    fontSizes: { title: string, value: string, description: string }
}) => {
    if (!cardConfig || typeof cardConfig === 'string') {
        return null; // Return null if the config for this card key doesn't exist or is invalid
    }

    const cardStyles = {
      backgroundColor: hslToHex(cardConfig.backgroundColor),
      color: hslToHex(cardConfig.textColor)
    };

    return (
        <Card className="flex-1 min-w-[320px] flex flex-col">
             <CardHeader className="rounded-t-xl">
                 <CardTitle className="text-lg">{cardLabel}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">即時預覽</Label>
                    <div style={cardStyles} className="rounded-lg p-4 border">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="font-medium" style={{color: cardStyles.color, opacity: 0.9, fontSize: fontSizes.title}}>{cardConfig.title}</h3>
                            <Icon className="h-4 w-4" style={{ color: cardStyles.color, opacity: 0.8 }} />
                        </div>
                        <div>
                             <div className="font-bold" style={{color: cardStyles.color, fontSize: fontSizes.value}}>
                                {cardKey.includes('Rank') ? '#1' : cardKey.includes('Value') || cardKey.includes('Assets') ? '$12,345' : '12,345'}
                            </div>
                            <p style={{color: cardStyles.color, opacity: 0.9, fontSize: fontSizes.description}}>{cardConfig.description.replace('{percentile}', '1')}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                        <Label htmlFor={`title-${cardKey}`}>標題文字</Label>
                        <Input 
                            id={`title-${cardKey}`}
                            value={cardConfig.title}
                            onChange={(e) => onTextChange(cardKey, 'title', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`desc-${cardKey}`}>說明文字</Label>
                        <Textarea 
                            id={`desc-${cardKey}`}
                            value={cardConfig.description}
                            onChange={(e) => onTextChange(cardKey, 'description', e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>
            </CardContent>
             <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t p-4">
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">顏色</h4>
                     <ColorPicker label="背景色" value={cardConfig.backgroundColor} onChange={(v) => onColorChange(cardKey, 'backgroundColor', v)} />
                     <ColorPicker label="文字" value={cardConfig.textColor} onChange={(v) => onColorChange(cardKey, 'textColor', v)} />
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
    const [cardConfig, setCardConfig] = useState<Partial<DashboardCardConfig>>(initialCardConfig);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig?.dashboardCards) {
             setCardConfig({ ...initialCardConfig, ...platformConfig.dashboardCards });
        } else {
             setCardConfig(initialCardConfig);
        }
    }, [platformConfig, router, toast]);

    const handleTextChange = (cardKey: CardFieldKeys, field: 'title' | 'description', value: string) => {
        setCardConfig(prev => {
            const currentCard = prev[cardKey];
            if (typeof currentCard === 'string' || !currentCard) return prev;
            return {
                ...prev,
                [cardKey]: {
                    ...currentCard,
                    [field]: value
                }
            };
        });
    };
    
    const handleColorChange = (cardKey: CardFieldKeys, field: 'backgroundColor' | 'textColor', value: string) => {
        setCardConfig(prev => {
            const currentCard = prev[cardKey];
            if (typeof currentCard === 'string' || !currentCard) return prev;
            return {
                ...prev,
                [cardKey]: {
                    ...currentCard,
                    [field]: value
                }
            };
        });
    };

    const handleFontSizeChange = (field: 'cardTitleSize' | 'cardValueSize' | 'cardDescriptionSize', value: string) => {
        setCardConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setPlatformConfig({ 
                dashboardCards: cardConfig as DashboardCardConfig,
            });
            toast({ title: "儲存成功", description: "儀表板卡片設定已更新。" });
        } catch (error: any) {
            console.error("Error saving dashboard settings:", error);
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!platformConfig || !cardConfig) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const editorCardMap: { [key in CardFieldKeys]?: { label: string, icon: React.ElementType } } = {
        totalPoints: { label: "目前點數卡片", icon: Coins },
        portfolioValue: { label: "投資價值卡片", icon: BarChart },
        fixedDeposits: { label: "定存點數卡片", icon: PiggyBank },
        totalAssets: { label: "總資產卡片", icon: Wallet },
        classRank: { label: "班級排名卡片", icon: Trophy },
        schoolRank: { label: "全校排名卡片", icon: Globe },
        myGroups: { label: "我的分組卡片", icon: Users },
        buKeXingQiu: { label: "布可星球卡片", icon: Star },
        myPet: { label: "我的寵物卡片", icon: Bone },
        pointsTrend: { label: "點數趨勢卡片", icon: LineChart },
    };

    const fontSizes = {
        title: cardConfig.cardTitleSize || '0.875rem',
        value: cardConfig.cardValueSize || '1.5rem',
        description: cardConfig.cardDescriptionSize || '0.75rem',
    };

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>儀表板卡片編輯</CardTitle>
                    <CardDescription>
                        您可以在此獨立自訂學生儀表板上所有資訊卡片的標題、說明文字與顏色。
                        <br/>
                        **注意**：部分說明文字包含 {'{'} {'}'} 符號（例如：{'{percentile}'}），這些是系統會自動替換的變數，請保留它們。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">卡片全域文字大小設定</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="font-size-title">標題文字大小 (rem)</Label>
                                <Input 
                                    id="font-size-title"
                                    value={cardConfig.cardTitleSize}
                                    onChange={(e) => handleFontSizeChange('cardTitleSize', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="font-size-value">數值文字大小 (rem)</Label>
                                <Input 
                                    id="font-size-value"
                                    value={cardConfig.cardValueSize}
                                    onChange={(e) => handleFontSizeChange('cardValueSize', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="font-size-desc">描述文字大小 (rem)</Label>
                                <Input 
                                    id="font-size-desc"
                                    value={cardConfig.cardDescriptionSize}
                                    onChange={(e) => handleFontSizeChange('cardDescriptionSize', e.target.value)}
                                />
                            </div>
                        </div>
                    </section>
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">頂部資訊卡 (4個)</h3>
                        <div className="flex flex-wrap gap-6">
                            {(['totalPoints', 'portfolioValue', 'fixedDeposits', 'totalAssets'] as CardFieldKeys[]).map((key) => {
                                const cardInfo = editorCardMap[key];
                                if (!cardInfo) return null;
                                return (
                                     <EditorCard 
                                        key={key}
                                        cardKey={key} 
                                        cardLabel={cardInfo.label} 
                                        cardConfig={cardConfig[key]}
                                        onTextChange={handleTextChange} 
                                        onColorChange={handleColorChange}
                                        icon={cardInfo.icon}
                                        fontSizes={fontSizes}
                                    />
                                );
                            })}
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">中間資訊卡 (4個)</h3>
                         <div className="flex flex-wrap gap-6">
                             {(['classRank', 'schoolRank', 'myGroups', 'buKeXingQiu'] as CardFieldKeys[]).map((key) => {
                                const cardInfo = editorCardMap[key];
                                if (!cardInfo) return null;
                                
                                return (
                                     <EditorCard 
                                        key={key}
                                        cardKey={key} 
                                        cardLabel={cardInfo.label} 
                                        cardConfig={cardConfig[key]}
                                        onTextChange={handleTextChange} 
                                        onColorChange={handleColorChange}
                                        icon={cardInfo.icon}
                                        fontSizes={fontSizes}
                                    />
                                );
                            })}
                        </div>
                    </section>

                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">底部資訊卡 (2個)</h3>
                        <div className="flex flex-wrap gap-6">
                           {(['myPet', 'pointsTrend'] as CardFieldKeys[]).map((key) => {
                                const cardInfo = editorCardMap[key];
                                if (!cardInfo) return null;
                                
                                return (
                                     <EditorCard 
                                        key={key}
                                        cardKey={key} 
                                        cardLabel={cardInfo.label} 
                                        cardConfig={cardConfig[key]}
                                        onTextChange={handleTextChange} 
                                        onColorChange={handleColorChange}
                                        icon={cardInfo.icon}
                                        fontSizes={fontSizes}
                                    />
                                );
                            })}
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
