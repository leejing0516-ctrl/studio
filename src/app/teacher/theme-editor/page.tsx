
"use client";

import { useState, useContext, useEffect, useRef } from "react";
import Image from "next/image";
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

const defaultThemeColors: CustomTheme = themes.find(t => t.name === 'default')?.cssVars.dark || {} as CustomTheme;

const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
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
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
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
};

const getHexFromHsl = (hslString: string | undefined): string => {
    if (typeof hslString !== 'string' || !hslString.includes(' ')) return '#000000';
    const parts = hslString.replace(/%/g, '').split(' ').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
        return hslToHex(parts[0], parts[1], parts[2]);
    }
    return '#000000';
};

const ColorInput = ({ colorKey, label, value, onChange }: { colorKey: string, label: string, value: string, onChange: (key: string, value: string) => void }) => {
    const hslRef = useRef<HTMLInputElement>(null);

    const handleColorPickerInput = (e: React.FormEvent<HTMLInputElement>) => {
        const hex = e.currentTarget.value;
        const hsl = hexToHsl(hex);
        if (hslRef.current) {
            hslRef.current.value = hsl; // Directly update the input field for visual feedback
        }
    };
    
    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(colorKey, hexToHsl(e.target.value));
    };

    const handleHslInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(colorKey, e.target.value);
    };
    
    return (
        <div className="space-y-2">
            <Label htmlFor={colorKey}>{label}</Label>
            <div className="flex items-center gap-2">
                <Input 
                    type="color"
                    value={getHexFromHsl(value)}
                    onInput={handleColorPickerInput}
                    onChange={handleColorPickerChange}
                    className="p-1 h-10 w-10 cursor-pointer"
                />
                <Input 
                    ref={hslRef}
                    id={colorKey}
                    defaultValue={value}
                    onChange={handleHslInputChange}
                    placeholder="例如: 210 40% 98%"
                    className="flex-1"
                />
            </div>
        </div>
    );
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
    { key: "chart-1", label: "儀表板卡片 1 (目前點數)" },
    { key: "chart-2", label: "儀表板卡片 2 (投資價值)" },
    { key: "chart-3", label: "儀表板卡片 3 (定存點數)" },
    { key: "chart-4", label: "儀表板卡片 4 (總資產)" },
    { key: "chart-5", label: "儀表板卡片 5 (排名/分組等)" },
];


const specialCardOptions = [
    { keyBackground: "reward-card-school", keyForeground: "reward-card-school-foreground", label: "學校獎勵卡片" },
    { keyBackground: "reward-card-class", keyForeground: "reward-card-class-foreground", label: "班級獎勵卡片" },
    { keyBackground: "bu-ke-xing-qiu-card-background", keyForeground: "bu-ke-xing-qiu-card-foreground", label: "布可星球卡片" },
    { keyBackground: "my-pet-card-background", keyForeground: "my-pet-card-foreground", label: "我的寵物卡片" },
    { keyBackground: "points-trend-card-background", keyForeground: "points-trend-card-foreground", label: "點數趨勢卡片" },

];

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


export default function TeacherThemeEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [customColors, setCustomColors] = useState<CustomTheme>(defaultThemeColors);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        const initialColors = platformConfig?.customTheme 
            || themes.find(t => t.name === platformConfig?.theme)?.cssVars.dark 
            || defaultThemeColors;
        setCustomColors(initialColors);
        
        Object.entries(initialColors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });

    }, [platformConfig, router, toast]);
    
    const handleValueChange = (key: string, value: string) => {
        setCustomColors(prev => ({ ...prev, [key]: value }));
        document.documentElement.style.setProperty(`--${key}`, value);
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
                document.documentElement.style.setProperty(`--${key}`, value as string);
            });
            toast({ title: "已重設", description: "顏色已重設為預設主題，請儲存以生效。" });
        }
    };

    const SizeInput = ({ sizeKey, label }: { sizeKey: string, label: string }) => (
        <div className="space-y-2">
            <Label htmlFor={sizeKey}>{label}</Label>
            <Input 
                id={sizeKey}
                value={customColors[sizeKey] || defaultThemeColors[sizeKey as keyof typeof defaultThemeColors] || ''}
                onChange={(e) => handleValueChange(sizeKey, e.target.value)}
                placeholder="例如: 1.5rem 或 24px"
                className="flex-1"
            />
        </div>
    );

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
                     <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold">主要顏色</h3>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {colorOptions.map(({ key, label }) => (
                                <ColorInput 
                                    key={key} 
                                    colorKey={key} 
                                    label={label} 
                                    value={customColors[key] || defaultThemeColors[key as keyof typeof defaultThemeColors] || ''}
                                    onChange={handleValueChange}
                                />
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <h3 className="text-lg font-semibold">儀表板卡片</h3>
                             <CardDescription>設定儀表板數據卡片的背景顏色。</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {chartColorOptions.map(({ key, label }) => (
                                <ColorInput 
                                    key={key} 
                                    colorKey={key} 
                                    label={label}
                                    value={customColors[key] || defaultThemeColors[key as keyof typeof defaultThemeColors] || ''}
                                    onChange={handleValueChange}
                                />
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <h3 className="text-lg font-semibold">其他特殊卡片</h3>
                             <CardDescription>設定獎勵商店等頁面中特殊卡片的顏色。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {specialCardOptions.map(({ keyBackground, keyForeground, label }) => (
                                <div key={keyBackground} className="p-4 border rounded-md">
                                    <h4 className="font-medium mb-4">{label}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <ColorInput 
                                            colorKey={keyBackground} 
                                            label="背景顏色"
                                            value={customColors[keyBackground] || defaultThemeColors[keyBackground as keyof typeof defaultThemeColors] || ''}
                                            onChange={handleValueChange}
                                        />
                                        <ColorInput 
                                            colorKey={keyForeground} 
                                            label="文字顏色"
                                            value={customColors[keyForeground] || defaultThemeColors[keyForeground as keyof typeof defaultThemeColors] || ''}
                                            onChange={handleValueChange}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <h3 className="text-lg font-semibold">全域卡片文字設定</h3>
                             <CardDescription>統一調整儀表板所有資訊卡片（包含頂部與下方卡片）的文字顏色與大小。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-medium mb-4">文字顏色</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {cardTextOptions.map(({ key, label }) => (
                                    <ColorInput 
                                        key={key} 
                                        colorKey={key} 
                                        label={label}
                                        value={customColors[key] || defaultThemeColors[key as keyof typeof defaultThemeColors] || ''}
                                        onChange={handleValueChange}
                                    />
                                ))}
                            </div>
                             <h4 className="font-medium mt-6 mb-4">文字大小</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {cardSizeOptions.map(({ key, label }) => (
                                    <SizeInput key={key} sizeKey={key} label={label} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

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

    