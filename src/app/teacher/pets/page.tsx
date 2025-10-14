
"use client";

import React, { useState, useContext, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImageOff, UploadCloud, Trash2, Coins, Wand2, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import type { PetStage } from "@/lib/types";
import { resizeImage, fileToDataUrl } from "@/lib/image-utils";

const defaultPetStages: PetStage[] = [
  {
    level: 1,
    name: "點點蛋",
    image: "https://i.imgur.com/2Ofa3a5.png",
    description: "一顆神秘的蛋，似乎對點數有反應。",
    pointsRequired: 0,
    aiHint: "mysterious egg",
  },
  {
    level: 2,
    name: "點點幼龍",
    image: "https://i.imgur.com/s6geD3w.png",
    description: "蛋孵化了！是隻活潑的幼龍，對世界充滿好奇。",
    pointsRequired: 500,
    aiHint: "cute baby dragon",
  },
  {
    level: 3,
    name: "點點巨龍",
    image: "https://i.imgur.com/N5NCt3I.png",
    description: "在充足的點數滋養下，牠成長為威風凜凜的巨龍！",
    pointsRequired: 2000,
    aiHint: "majestic dragon",
  },
];


export default function TeacherPetsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [petStages, setPetStages] = useState<PetStage[]>([]);
    
    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig?.petStages) {
            setPetStages(platformConfig.petStages);
        } else {
            setPetStages(defaultPetStages);
        }
    }, [platformConfig, router, toast]);

    const handleStageChange = (index: number, field: keyof PetStage, value: string | number) => {
        const newStages = [...petStages];
        (newStages[index] as any)[field] = value;
        setPetStages(newStages);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingKey(`stage_${index}`);
        try {
            const resizedFile = await resizeImage(file, 512, 512);
            const dataUrl = await fileToDataUrl(resizedFile);
            handleStageChange(index, 'image', dataUrl);
            toast({ title: "圖片已預覽", description: "請記得點擊下方的「儲存設定」以保存變更。" });
        } catch (error) {
            console.error("Image processing error:", error);
            toast({ title: "圖片處理失敗", variant: "destructive" });
        } finally {
            setUploadingKey(null);
        }
    };
    
    const handleRemoveImage = (index: number) => {
        handleStageChange(index, 'image', '');
    };

    const addStage = () => {
        const lastStage = petStages[petStages.length - 1];
        setPetStages([...petStages, {
            level: (lastStage?.level || 0) + 1,
            name: "新階段",
            image: "",
            description: "",
            pointsRequired: (lastStage?.pointsRequired || 0) + 1000,
            aiHint: "",
        }]);
    };

    const removeStage = (index: number) => {
        if (petStages.length <= 1) {
            toast({ title: "無法刪除", description: "至少需要保留一個寵物階段。", variant: "destructive" });
            return;
        }
        const newStages = petStages.filter((_, i) => i !== index);
        setPetStages(newStages);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const finalStages = petStages.map((stage, index) => ({
            ...stage,
            level: index + 1,
        }));

        try {
            await setPlatformConfig({ petStages: finalStages });
            toast({ title: "儲存成功", description: "寵物進化規則已更新。" });
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
                    <CardTitle>寵物進化規則管理</CardTitle>
                    <CardDescription>
                        您可以在此設定寵物進化的「規則」。AI 會根據您設定的「AI 提示詞」為每個學生生成獨一無二的寵物外觀。
                        您主要負責定義：1. 進化所需的點數門檻。 2. 每個階段的主題（名稱與提示詞）。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {petStages.map((stage, index) => (
                             <Card key={index} className="p-4 relative border-2">
                                <CardHeader className="p-2">
                                    <CardTitle>階段 {index + 1}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>預設圖片 (僅作為初始或備用)</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                                    {stage.image ? (
                                                        <Image src={stage.image} alt={stage.name} fill className="object-contain p-1" />
                                                    ) : (
                                                        <ImageOff className="h-8 w-8 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <Input id={`image-upload-${index}`} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, index)} className="hidden" disabled={!!uploadingKey} />
                                                    <Label htmlFor={`image-upload-${index}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                                        {uploadingKey === `stage_${index}` ? <Loader2 className="mr-2 animate-spin"/> : <UploadCloud className="mr-2"/>}
                                                        上傳
                                                    </Label>
                                                    {stage.image && (
                                                        <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={() => handleRemoveImage(index)} disabled={!!uploadingKey}>
                                                            <Trash2 className="h-4 w-4" />
                                                            移除
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`points-${index}`}>進化所需點數門檻</Label>
                                            <div className="flex items-center gap-2">
                                                <Coins className="h-5 w-5 text-muted-foreground"/>
                                                <Input 
                                                    id={`points-${index}`}
                                                    type="number"
                                                    value={stage.pointsRequired}
                                                    onChange={(e) => handleStageChange(index, 'pointsRequired', Number(e.target.value))}
                                                    disabled={index === 0}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`name-${index}`}>階段名稱</Label>
                                            <Input id={`name-${index}`} value={stage.name} onChange={(e) => handleStageChange(index, 'name', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`desc-${index}`}>階段描述</Label>
                                            <Textarea id={`desc-${index}`} value={stage.description} onChange={(e) => handleStageChange(index, 'description', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`ai-hint-${index}`} className="flex items-center gap-1.5">
                                                <Wand2 className="h-4 w-4 text-primary" />
                                                AI 進化提示詞 (AI Hint)
                                            </Label>
                                            <Input id={`ai-hint-${index}`} value={stage.aiHint} onChange={(e) => handleStageChange(index, 'aiHint', e.target.value)} placeholder="例如：cute baby dragon" />
                                            <p className="text-xs text-muted-foreground">給 AI 畫家的靈感關鍵字，它會基於此主題生成獨特的寵物。</p>
                                        </div>
                                    </div>
                                </CardContent>
                                {petStages.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-destructive hover:text-destructive"
                                        onClick={() => removeStage(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                    <div className="flex justify-start mt-6">
                        <Button variant="outline" onClick={addStage}>新增進化階段</Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || !!uploadingKey}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        儲存進化規則
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
