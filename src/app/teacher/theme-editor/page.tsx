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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Palette, Trash2, PlusCircle } from "lucide-react";
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
        <div className="space-y-2">
            <Label htmlFor={`color-picker-${label}`} className="text-xs">{label}</Label>
            <div className="flex items-center gap-2">
                <Input
                    id={`color-picker-${label}`}
                    type="color"
                    value={hexValue}
                    onChange={handleColorChange}
                    className="w-8 h-8 p-0 border-none rounded-md"
                />
                <Input 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-xs"
                />
            </div>
        </div>
    );
};


export default function TeacherThemeEditorPage() {
    const { platformConfig } = useContext(AppDataContext);
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
        setThemes([...defaultThemes, ...customThemes]);

    }, [platformConfig, router, toast]);

    const handleThemeChange = (themeIndex: number, field: keyof Theme['cssVars']['dark'], value: string) => {
        const newThemes = [...themes];
        newThemes[themeIndex].cssVars.dark[field] = value;
        setThemes(newThemes);
    };

    const handleLabelChange = (themeIndex: number, value: string) => {
        const newThemes = [...themes];
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
            const configRef = doc(db, 'config', 'main');
            await setDoc(configRef, { customThemes: customThemesToSave }, { merge: true });
            toast({ title: "儲存成功", description: "自訂主題已更新。" });
        } catch (error: any) {
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>主題編輯器</CardTitle>
                    <CardDescription>
                       您可以在此新增或編輯自訂的顏色主題。顏色值請使用 HSL 格式 (例如: 210 40% 98%)。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {themes.map((theme, themeIndex) => (
                        <Card key={theme.name} className="overflow-hidden">
                             <CardHeader className="bg-muted/30 flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <Input value={theme.label} onChange={e => handleLabelChange(themeIndex, e.target.value)} className="text-lg font-semibold p-0 h-auto border-none focus-visible:ring-0" disabled={!theme.name.startsWith('custom-')} />
                                    <p className="text-xs text-muted-foreground">主題ID: {theme.name}</p>
                                </div>
                                {theme.name.startsWith('custom-') && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>確定刪除此主題嗎？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作無法復原。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteTheme(themeIndex)}>確定</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {Object.entries(theme.cssVars.dark).map(([key, value]) => (
                                    <ColorPicker 
                                        key={key}
                                        label={key}
                                        value={value}
                                        onChange={(newValue) => handleThemeChange(themeIndex, key as keyof Theme['cssVars']['dark'], newValue)}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                    <div className="flex justify-start">
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
