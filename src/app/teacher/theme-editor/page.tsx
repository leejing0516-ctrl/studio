
"use client";

import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Palette, Trash2, PlusCircle, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { themes as defaultThemes, type Theme } from "@/lib/themes";
import { hslToHex, hexToHsl } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ColorPicker = ({ label, value, onChange, disabled = false }: { label: string, value: string, onChange: (value: string) => void, disabled?: boolean }) => {
    const hexValue = hslToHex(value);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newHexValue = e.target.value;
        const newHslValue = hexToHsl(newHexValue);
        if (newHslValue) {
            onChange(newHslValue);
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={`color-picker-${label}`} className="text-xs capitalize">{label.replace(/-/g, ' ')}</Label>
            <div className="flex items-center gap-2">
                <Input
                    id={`color-picker-${label}`}
                    type="color"
                    value={hexValue}
                    onChange={handleColorChange}
                    className="w-8 h-8 p-0 border-none rounded-md"
                    disabled={disabled}
                />
                <Input 
                    value={value}
                    onChange={(e) => !disabled && onChange(e.target.value)}
                    className="h-8 text-xs"
                    disabled={disabled}
                    placeholder="e.g., 210 40% 98%"
                />
            </div>
        </div>
    );
};

export default function TeacherThemeEditorPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [themes, setThemes] = useState<Theme[]>([]);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        const customThemes = platformConfig?.customThemes || [];
        // Ensure default themes are not duplicated if they somehow get into customThemes
        const defaultThemeNames = new Set(defaultThemes.map(t => t.name));
        const filteredCustomThemes = customThemes.filter(t => !defaultThemeNames.has(t.name));

        setThemes([...defaultThemes, ...filteredCustomThemes]);

    }, [platformConfig, router, toast]);

    const handleThemeChange = (themeIndex: number, field: keyof Theme['cssVars']['dark'], value: string) => {
        const newThemes = [...themes];
        if (!newThemes[themeIndex].name.startsWith('custom-')) return;
        newThemes[themeIndex].cssVars.dark[field] = value;
        setThemes(newThemes);
    };

    const handleLabelChange = (themeIndex: number, value: string) => {
        const newThemes = [...themes];
        if (!newThemes[themeIndex].name.startsWith('custom-')) return;
        newThemes[themeIndex].label = value;
        setThemes(newThemes);
    }
    
    const handleAddNewTheme = () => {
        const newTheme: Theme = {
            name: `custom-${Date.now()}`,
            label: "新的自訂主題",
            cssVars: {
                dark: { ...defaultThemes[0].cssVars.dark } // Start with default theme colors
            }
        };
        setThemes([...themes, newTheme]);
    }
    
    const handleDeleteTheme = (themeIndex: number) => {
        if (themes[themeIndex].name.startsWith('custom-')) {
            const newThemes = themes.filter((_, index) => index !== themeIndex);
            setThemes(newThemes);
        } else {
            toast({ title: "無法刪除", description: "您不能刪除預設的系統主題。", variant: "destructive" });
        }
    }

    const handleSave = async () => {
        setIsSaving(true);
        const customThemesToSave = themes.filter(t => t.name.startsWith('custom-'));
        
        try {
            await setPlatformConfig({ customThemes: customThemesToSave });
            toast({ title: "儲存成功", description: "自訂主題已更新。" });
        } catch (error: any) {
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/teacher/settings" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">返回</span>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">主題編輯器</h1>
                    <p className="text-muted-foreground">
                       在此新增或編輯自訂顏色主題。顏色值請使用 HSL 格式 (例如: 210 40% 98%)。
                    </p>
                </div>
            </div>
            
            <Card>
                <CardContent className="pt-6 space-y-6">
                    {themes.map((theme, themeIndex) => {
                         const isCustom = theme.name.startsWith('custom-');
                         const previewStyle = {
                            '--bg': `hsl(${theme.cssVars.dark.background})`,
                            '--fg': `hsl(${theme.cssVars.dark.foreground})`,
                            '--primary': `hsl(${theme.cssVars.dark.primary})`,
                            '--primary-fg': `hsl(${theme.cssVars.dark['primary-foreground']})`,
                         } as React.CSSProperties;

                         return (
                            <Card key={theme.name} className="overflow-hidden">
                                <CardHeader className="bg-muted/30 flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <Input 
                                            value={theme.label} 
                                            onChange={e => handleLabelChange(themeIndex, e.target.value)} 
                                            className="text-lg font-semibold p-0 h-auto border-none focus-visible:ring-0 bg-transparent disabled:cursor-default disabled:opacity-100" 
                                            disabled={!isCustom} 
                                        />
                                        <p className="text-xs text-muted-foreground">主題 ID: {theme.name} {!isCustom && "(系統預設)"}</p>
                                    </div>
                                    {isCustom && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>確定刪除此主題嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>此操作無法復原。</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTheme(themeIndex)}>確定刪除</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 grid grid-cols-1 xl:grid-cols-4 gap-6">
                                     <div className="space-y-2 xl:col-span-1">
                                        <Label className="text-sm font-medium">即時預覽</Label>
                                        <div style={previewStyle} className="rounded-lg p-4 border space-y-4 bg-[var(--bg)] text-[var(--fg)]">
                                            <h4 className="font-bold">主題預覽</h4>
                                            <p className="text-sm">這是套用此主題的樣子。</p>
                                            <Button style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}>主要按鈕</Button>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-md border grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 xl:col-span-3">
                                        {Object.entries(theme.cssVars.dark).map(([key, value]) => (
                                            <ColorPicker 
                                                key={key}
                                                label={key}
                                                value={value}
                                                onChange={(newValue) => handleThemeChange(themeIndex, key as keyof Theme['cssVars']['dark'], newValue)}
                                                disabled={!isCustom}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    <div className="flex justify-start pt-4 border-t">
                        <Button variant="outline" onClick={handleAddNewTheme}>
                            <PlusCircle className="mr-2" />
                            新增自訂主題
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur-sm py-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        儲存所有主題
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
