

"use client";

import { useState, useContext, useEffect } from "react";
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
import { Loader2, ImageOff, UploadCloud, Trash2, Coins } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import type { PetStage } from "@/lib/types";
import { useFirebaseStorage } from "@/hooks/use-firebase-storage";

const MAX_FILE_SIZE = 800 * 1024; // 800KB

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
    const { uploadFile, isUploading } = useFirebaseStorage();
    
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

        if (file.size > MAX_FILE_SIZE) {
            toast({ title: "檔案太大", description: `請選擇小於 ${MAX_FILE_SIZE / 1024}KB 的圖片。`, variant: "destructive" });
            return;
        }

        setUploadingKey(`stage_${index}`);
        const filePath = `pets/${Date.now()}-stage${index + 1}-${file.name}`;
        const url = await uploadFile(file, filePath);

        if (url) {
            handleStageChange(index, 'image', url);
            toast({ title: "圖片已上傳", description: "請記得點擊下方的「儲存設定」以保存變更。" });
        } else {
            toast({ title: "圖片上傳失敗", variant: "destructive" });
        }
        setUploadingKey(null);
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
        try {
            await setPlatformConfig({ petStages: petStages });
            toast({ title: "儲存成功", description: "寵物設定已更新。" });
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
                    <CardTitle>寵物進化管理</CardTitle>
                    <CardDescription>設定學生寵物的不同進化階段、圖片、名稱以及進化所需的點數。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {petStages.map((stage, index) => (
                        <Card key={index} className="p-4 relative">
                            <CardHeader className="p-2">
                                <CardTitle>階段 {index + 1}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <Label>寵物圖片</Label>
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
                                        <Label htmlFor={`points-${index}`}>進化所需點數</Label>
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
                                        <Label htmlFor={`desc-${index}`}>描述</Label>
                                        <Textarea id={`desc-${index}`} value={stage.description} onChange={(e) => handleStageChange(index, 'description', e.target.value)} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor={`ai-hint-${index}`}>AI 圖片提示詞</Label>
                                        <Input id={`ai-hint-${index}`} value={stage.aiHint} onChange={(e) => handleStageChange(index, 'aiHint', e.target.value)} placeholder="例如：cute dragon" />
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
                    <div className="flex justify-start">
                        <Button variant="outline" onClick={addStage}>新增進化階段</Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || !!uploadingKey}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        儲存寵物設定
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
