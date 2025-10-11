

"use client";

import { useState, useContext, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { themes } from "@/lib/themes";
import type { CustomTheme } from "@/lib/types";

const defaultThemeColors: CustomTheme = {
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%",
    card: "0 0% 100%",
    "card-foreground": "222.2 84% 4.9%",
    popover: "0 0% 100%",
    "popover-foreground": "222.2 84% 4.9%",
    primary: "222.2 47.4% 11.2%",
    "primary-foreground": "210 40% 98%",
    secondary: "210 40% 96.1%",
    "secondary-foreground": "222.2 47.4% 11.2%",
    muted: "210 40% 96.1%",
    "muted-foreground": "215.4 16.3% 46.9%",
    accent: "210 40% 96.1%",
    "accent-foreground": "222.2 47.4% 11.2%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "214.3 31.8% 91.4%",
    input: "214.3 31.8% 91.4%",
    ring: "222.2 84% 4.9%",
    "chart-1": "48 96% 53%",
    "chart-2": "180 80% 45%",
    "chart-3": "217 91% 60%",
    "chart-4": "300 80% 60%",
    "reward-card-school": "25 95% 55%",
    "reward-card-class": "140 70% 40%",
    "card-title-foreground": "210 40% 98%",
    "card-value-foreground": "210 40% 98%",
    "card-description-foreground": "210 40% 90%",
    "card-title-size": "0.875rem",
    "card-value-size": "1.5rem",
    "card-description-size": "0.75rem",
    "dashboard-card-background": "0 0% 100%",
    "dashboard-card-foreground": "222.2 84% 4.9%",
};

const colorOptions = [
    { key: "background", label: "背景色" },
    { key: "foreground", label: "前景色 (主要文字)" },
    { key: "card", label: "卡片背景" },
    { key: "card-foreground", label: "卡片文字" },
    { key: "primary", label: "主要顏色 (按鈕、重點)" },
    { key: "primary-foreground", label: "主要顏色上的文字" },
    { key: "secondary", label: "次要顏色 (次要按鈕)" },
    { key: "secondary-foreground", label: "次要顏色上的文字" },
    { key: "accent", label: "強調色 (滑鼠懸停、焦點)" },
    { key: "accent-foreground", label: "強調色上的文字" },
    { key: "destructive", label: "危險/刪除色" },
    { key: "border", label: "邊框顏色" },
];

const chartColorOptions = [
    { key: "chart-1", label: "儀表板卡片 1 (總點數)" },
    { key: "chart-2", label: "儀表板卡片 2 (投資組合)" },
    { key: "chart-3", label: "儀表板卡片 3 (定存總額)" },
    { key: "chart-4", label: "儀表板卡片 4 (總資產)" },
]

const cardColorOptions = [
    { key: "reward-card-school", label: "學校獎勵卡片" },
    { key: "reward-card-class", label: "班級獎勵卡片" },
    { key: "dashboard-card-background", label: "儀表板通用卡片背景" },
    { key: "dashboard-card-foreground", label: "儀表板通用卡片文字" },
]

const cardTextOptions = [
    { key: "card-title-foreground", label: "卡片標題文字顏色" },
    { key: "card-value-foreground", label: "卡片數值文字顏色" },
    { key: "card-description-foreground", label: "卡片描述文字顏色" },
];

const cardSizeOptions = [
    { key: "card-title-size", label: "卡片標題文字大小" },
    { key: "card-value-size", label: "卡片數值文字大小" },
    { key: "card-description-size", label: "卡片描述文字大小" },
];


// Color conversion helpers
function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}


export default function TeacherThemeEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [customColors, setCustomColors] = useState<CustomTheme>({});

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig?.customTheme) {
            setCustomColors(platformConfig.customTheme);
        } else if (platformConfig?.theme) {
            const baseTheme = themes.find(t => t.name === platformConfig.theme);
            if (baseTheme) {
                setCustomColors(baseTheme.cssVars.dark);
            }
        } else {
             setCustomColors(defaultThemeColors);
        }
    }, [platformConfig, router, toast]);

    const handleValueChange = (key: string, value: string) => {
        const newValues = { ...customColors, [key]: value };
        setCustomColors(newValues);
        document.documentElement.style.setProperty(`--${key}`, value);
    };

    const handleHexColorChange = (key: string, hex: string) => {
        const hsl = hexToHsl(hex);
        handleValueChange(key, hsl);
    };

    const getHexFromHsl = (key: string): string => {
        const hslString = customColors[key] || defaultThemeColors[key] || "0 0% 0%";
        const parts = hslString.replace(/%/g, '').split(' ').map(Number);
        if (parts.length === 3) {
            return hslToHex(parts[0], parts[1], parts[2]);
        }
        return '#000000';
    };

    const handleSaveTheme = async () => {
        setIsSaving(true);
        try {
            await setPlatformConfig({ 
                customTheme: customColors,
                theme: 'custom',
            });
            toast({ title: "主題已儲存", description: "您的自訂顏色主題已成功儲存並套用。" });
        } catch (error: any) {
            console.error("Error saving custom theme:", error);
            toast({ title: "儲存失敗", description: error.message || "儲存自訂主題時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const resetToDefaults = () => {
        const defaultTheme = themes.find(t => t.name === 'default');
        if (defaultTheme) {
            setCustomColors(defaultTheme.cssVars.dark);
            Object.entries(defaultTheme.cssVars.dark).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, value);
            });
            toast({ title: "已重設", description: "顏色已重設為預設主題，請儲存以生效。" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>主題編輯器</CardTitle>
                    <CardDescription>
                        自訂您平台的主要顏色。您可以點擊色塊來使用滴管或色盤選色，或直接輸入 HSL 格式 (色相、飽和度%、亮度%) 的數值。變更會即時預覽，滿意後請務必點擊下方的「儲存自訂主題」按鈕。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                     <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">主要顏色</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {colorOptions.map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="color"
                                            value={getHexFromHsl(key)}
                                            onChange={(e) => handleHexColorChange(key, e.target.value)}
                                            className="p-1 h-10 w-10 cursor-pointer"
                                        />
                                        <Input 
                                            id={key}
                                            value={customColors[key] || defaultThemeColors[key] || ''}
                                            onChange={(e) => handleValueChange(key, e.target.value)}
                                            placeholder="例如: 210 40% 98%"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">儀表板頂部卡片</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {chartColorOptions.map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="color"
                                            value={getHexFromHsl(key)}
                                            onChange={(e) => handleHexColorChange(key, e.target.value)}
                                            className="p-1 h-10 w-10 cursor-pointer"
                                        />
                                        <Input 
                                            id={key}
                                            value={customColors[key] || defaultThemeColors[key] || ''}
                                            onChange={(e) => handleValueChange(key, e.target.value)}
                                            placeholder="例如: 48 96% 53%"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">各式卡片顏色</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cardColorOptions.map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="color"
                                            value={getHexFromHsl(key)}
                                            onChange={(e) => handleHexColorChange(key, e.target.value)}
                                            className="p-1 h-10 w-10 cursor-pointer"
                                        />
                                        <Input 
                                            id={key}
                                            value={customColors[key] || defaultThemeColors[key] || ''}
                                            onChange={(e) => handleValueChange(key, e.target.value)}
                                            placeholder="例如: 25 95% 55%"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">儀表板頂部卡片文字</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cardTextOptions.map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="color"
                                            value={getHexFromHsl(key)}
                                            onChange={(e) => handleHexColorChange(key, e.target.value)}
                                            className="p-1 h-10 w-10 cursor-pointer"
                                        />
                                        <Input 
                                            id={key}
                                            value={customColors[key] || defaultThemeColors[key] || ''}
                                            onChange={(e) => handleValueChange(key, e.target.value)}
                                            placeholder="例如: 210 40% 98%"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                             {cardSizeOptions.map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            id={key}
                                            value={customColors[key] || defaultThemeColors[key] || ''}
                                            onChange={(e) => handleValueChange(key, e.target.value)}
                                            placeholder="例如: 1.5rem 或 24px"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

             <div className="flex justify-between">
                <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>重設為預設主題</Button>
                <Button onClick={handleSaveTheme} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    儲存自訂主題
                </Button>
            </div>
        </div>
    );
}
