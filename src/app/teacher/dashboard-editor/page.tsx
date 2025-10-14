
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
import { Loader2, Coins, BarChart, PiggyBank, Wallet, Trophy, Globe, Users, Star, Bone, LineChart, Landmark } from "lucide-react";
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
    currentLoan: { title: "目前貸款", description: "需在期限內償還" },
    classRank: { title: "班級排名", description: "班級前 {percentile}%" },
    schoolRank: { title: "全校排名", description: "全校前 {percentile}%" },
    myGroups: { title: "我的分組", description: "您尚未被分派到任何小組。" },
    buKeXingQiu: { title: "布可星球", description: "你在閱讀世界中的榮譽等級" },
    myPet: { title: "我的寵物", description: "您的點數越多，牠就會越強大！" },
    pointsTrend: { title: "最近七日點數趨勢", description: "您最近七天每日從老師那裡獲得的點數紀錄。" },
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
    texts, 
    colors,
    onTextChange,
    onColorChange,
    icon: Icon,
}: { 
    cardKey: CardFieldKeys, 
    cardLabel: string, 
    texts: {title: string, description: string}, 
    colors: {bg: string, text: string},
    onTextChange: (key: CardFieldKeys, field: 'title' | 'description', value: string) => void,
    onColorChange: (key: string, value: string) => void,
    icon: React.ElementType
}) => {

    const cardStyles = {
      backgroundColor: hslToHex(colors.bg),
      color: hslToHex(colors.text)
    };

    return (
        <Card className="flex-1 min-w-[320px] flex flex-col">
             <CardHeader className="rounded-t-xl">
                 <CardTitle className="text-lg">{cardLabel}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                 {/* Live Preview */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">即時預覽</Label>
                    <div style={cardStyles} className="rounded-lg p-4 border">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium">{texts.title}</h3>
                            <Icon className="h-4 w-4" style={{ opacity: 0.8 }} />
                        </div>
                        <div>
                             <div className="text-2xl font-bold">
                                {cardKey.includes('Rank') ? '#1' : cardKey.includes('Value') || cardKey.includes('Assets') || cardKey.includes('Loan') ? '$12,345' : '12,345'}
                            </div>
                            <p className="text-xs">{texts.description.replace('{percentile}', '1')}</p>
                        </div>
                    </div>
                </div>

                {/* Edit Fields */}
                <div className="space-y-4 pt-4 border-t">
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
                </div>
            </CardContent>
             <CardFooter className="mt-auto grid grid-cols-2 gap-4 border-t p-4">
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">顏色</h4>
                     <ColorPicker label="背景色" value={colors.bg} onChange={(v) => onColorChange(cardKey.replace(/([A-Z])/g, '-$1').toLowerCase() + '-background', v)} />
                     <ColorPicker label="文字" value={colors.text} onChange={(v) => onColorChange(cardKey.replace(/([A-Z])/g, '-$1').toLowerCase() + '-foreground', v)} />
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

    const editorCardMap: { [key in CardFieldKeys]?: { label: string, icon: React.ElementType, bgKey: keyof CustomTheme, textKey: keyof CustomTheme } } = {
        totalPoints: { label: "目前點數卡片", icon: Coins, bgKey: 'chart-1', textKey: 'card-foreground' },
        portfolioValue: { label: "投資價值卡片", icon: BarChart, bgKey: 'chart-2', textKey: 'card-foreground' },
        fixedDeposits: { label: "定存點數卡片", icon: PiggyBank, bgKey: 'chart-3', textKey: 'card-foreground' },
        totalAssets: { label: "總資產卡片", icon: Wallet, bgKey: 'chart-4', textKey: 'card-foreground' },
        currentLoan: { label: "目前貸款卡片", icon: Landmark, bgKey: 'chart-4', textKey: 'card-foreground' },
        classRank: { label: "班級排名卡片", icon: Trophy, bgKey: 'chart-5', textKey: 'card-foreground' },
        schoolRank: { label: "全校排名卡片", icon: Globe, bgKey: 'chart-5', textKey: 'card-foreground' },
        myGroups: { label: "我的分組卡片", icon: Users, bgKey: 'chart-5', textKey: 'card-foreground' },
        buKeXingQiu: { label: "布可星球卡片", icon: Star, bgKey: 'bu-ke-xing-qiu-card-background', textKey: 'bu-ke-xing-qiu-card-foreground' },
        myPet: { label: "我的寵物卡片", icon: Bone, bgKey: 'my-pet-card-background', textKey: 'my-pet-card-foreground' },
        pointsTrend: { label: "點數趨勢卡片", icon: LineChart, bgKey: 'points-trend-card-background', textKey: 'points-trend-card-foreground' },
    };


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
                            {['totalPoints', 'portfolioValue', 'fixedDeposits', 'totalAssets', 'currentLoan'].map((key) => {
                                const cardKey = key as CardFieldKeys;
                                
                                // Separate editor for totalAssets and currentLoan
                                if (cardKey === 'currentLoan' || cardKey === 'totalAssets') return null;

                                const cardInfo = editorCardMap[cardKey];
                                if (!cardInfo) return null;
                                return (
                                     <EditorCard 
                                        key={cardKey}
                                        cardKey={cardKey} 
                                        cardLabel={cardInfo.label} 
                                        texts={cardTexts[cardKey]} 
                                        colors={{bg: customTheme[cardInfo.bgKey], text: customTheme[cardInfo.textKey]}} 
                                        onTextChange={handleTextChange} 
                                        onColorChange={(key, value) => handleColorChange(cardInfo.bgKey, value)}
                                        icon={cardInfo.icon}
                                    />
                                );
                            })}
                            
                            {/* Editor for Total Assets */}
                            <EditorCard 
                                cardKey='totalAssets'
                                cardLabel='總資產卡片'
                                texts={cardTexts['totalAssets']} 
                                colors={{bg: customTheme['chart-4'], text: customTheme['card-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={(key, value) => handleColorChange('chart-4', value)}
                                icon={Wallet}
                            />
                             {/* Editor for Current Loan */}
                            <EditorCard 
                                cardKey='currentLoan'
                                cardLabel='目前貸款卡片'
                                texts={cardTexts['currentLoan']} 
                                colors={{bg: customTheme['chart-4'], text: customTheme['card-foreground']}} 
                                onTextChange={handleTextChange} 
                                onColorChange={(key, value) => handleColorChange('chart-4', value)}
                                icon={Landmark}
                            />
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">中間資訊卡 (4個)</h3>
                         <div className="flex flex-wrap gap-6">
                             {['classRank', 'schoolRank', 'myGroups', 'buKeXingQiu'].map((key) => {
                                const cardKey = key as CardFieldKeys;
                                const cardInfo = editorCardMap[cardKey];
                                if (!cardInfo) return null;

                                const cardColors = {
                                    bg: customTheme[cardInfo.bgKey],
                                    text: customTheme[cardInfo.textKey]
                                };
                                
                                return (
                                     <EditorCard 
                                        key={cardKey}
                                        cardKey={cardKey} 
                                        cardLabel={cardInfo.label} 
                                        texts={cardTexts[cardKey]} 
                                        colors={cardColors as any}
                                        onTextChange={handleTextChange} 
                                        onColorChange={(key, value) => {
                                             if (key === 'card-foreground') {
                                                handleColorChange(cardInfo.textKey, value);
                                            } else {
                                                handleColorChange(cardInfo.bgKey, value);
                                            }
                                        }}
                                        icon={cardInfo.icon}
                                    />
                                );
                            })}
                        </div>
                    </section>

                     <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2">底部資訊卡 (2個)</h3>
                        <div className="flex flex-wrap gap-6">
                           {['myPet', 'pointsTrend'].map((key) => {
                                const cardKey = key as CardFieldKeys;
                                const cardInfo = editorCardMap[cardKey];
                                if (!cardInfo) return null;
                                
                                return (
                                     <EditorCard 
                                        key={cardKey}
                                        cardKey={cardKey} 
                                        cardLabel={cardInfo.label} 
                                        texts={cardTexts[cardKey]} 
                                        colors={{bg: customTheme[cardInfo.bgKey], text: customTheme[cardInfo.textKey]}} 
                                        onTextChange={handleTextChange} 
                                        onColorChange={(key, value) => {
                                            if (key.includes('foreground')) {
                                                handleColorChange(cardInfo.textKey, value);
                                            } else {
                                                handleColorChange(cardInfo.bgKey, value);
                                            }
                                        }}
                                        icon={cardInfo.icon}
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
