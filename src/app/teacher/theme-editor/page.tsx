
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

    const handleColorChange = (key: string, value: string) => {
        const newColors = { ...customColors, [key]: value };
        setCustomColors(newColors);
        // Live preview
        document.documentElement.style.setProperty(`--${key}`, value);
    };

    const handleSaveTheme = async () => {
        setIsSaving(true);
        try {
            await setPlatformConfig({ 
                customTheme: customColors,
                theme: 'custom', // Set theme to custom to activate the new colors
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
                        自訂您平台的主要顏色。顏色值使用 HSL 格式 (色相、飽和度%、亮度%)，例如：222.2 47.4% 11.2%。
                        變更會即時預覽，滿意後請務必點擊下方的「儲存自訂主題」按鈕。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {colorOptions.map(({ key, label }) => (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key} className="flex items-center gap-2">
                                    <div 
                                        className="h-4 w-4 rounded-full border"
                                        style={{ backgroundColor: `hsl(${customColors[key] || defaultThemeColors[key]})` }} 
                                    />
                                    {label}
                                </Label>
                                <Input 
                                    id={key}
                                    value={customColors[key] || ''}
                                    onChange={(e) => handleColorChange(key, e.target.value)}
                                    placeholder="例如: 210 40% 98%"
                                />
                            </div>
                        ))}
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
