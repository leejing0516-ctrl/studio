
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { Loader2, ImageOff, UploadCloud, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage, fileToDataUrl } from "@/lib/image-utils";
import { useSchoolStore } from "@/store/useSchoolStore";
import { useAuth } from "@/context/AuthContext";

export default function TeacherHomeEditorPage() {
    const { config: platformConfig } = useSchoolStore();
    const { setPlatformConfig, teacher } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [homeTitle, setHomeTitle] = useState<string>('');
    const [homeSubtitle, setHomeSubtitle] = useState<string>('');
    const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);

    useEffect(() => {
        if (teacher && teacher.role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig) {
            setHomeTitle(platformConfig.homeTitle || '歡迎來到南梓實小虛擬銀行');
            setHomeSubtitle(platformConfig.homeSubtitle || '您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！');
            setIllustrationUrl(platformConfig.homeIllustrationUrl || null);
        }
    }, [platformConfig, router, toast, teacher]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const resizedFile = await resizeImage(file, 800, 600);
            const dataUrl = await fileToDataUrl(resizedFile);
            setIllustrationUrl(dataUrl);
            toast({ title: "圖片已預覽", description: "請記得點擊下方的「儲存設定」以保存變更。" });
        } catch (error) {
            console.error("Image processing error:", error);
            toast({ title: "圖片處理失敗", description: "處理圖片時發生錯誤，請稍後再試。", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setIllustrationUrl(null);
        toast({ title: "預覽已移除", description: "請儲存設定以讓變更生效。" });
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        
        try {
            await setPlatformConfig({
                homeTitle: homeTitle,
                homeSubtitle: homeSubtitle,
                homeIllustrationUrl: illustrationUrl || '',
            });

            toast({ title: "設定已儲存", description: "首頁內容已成功更新。" });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: error.message || "儲存首頁設定時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (!teacher) return null;

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>首頁內容編輯</CardTitle>
                    <CardDescription>管理登入頁面的主標題、副標題和插圖。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="home-title">主標題</Label>
                        <Input 
                            id="home-title" 
                            value={homeTitle}
                            onChange={(e) => setHomeTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="home-subtitle">副標題</Label>
                        <Textarea 
                            id="home-subtitle" 
                            value={homeSubtitle}
                            onChange={(e) => setHomeSubtitle(e.target.value)}
                            rows={3}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>插圖</Label>
                        <Card className="p-4 flex flex-col items-center gap-4 text-center">
                             <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center relative group">
                                {illustrationUrl ? (
                                    <Image src={illustrationUrl} alt="首頁插圖預覽" fill className="object-contain p-2" />
                                ) : (
                                    <div className="text-muted-foreground">
                                        <ImageOff className="h-10 w-10 mx-auto mb-2"/>
                                        <p>尚未設定插圖</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input id="illustration-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                                <Label htmlFor="illustration-upload" className={buttonVariants({ variant: "outline", size: "sm" })}>
                                     {isUploading ? <Loader2 className="mr-2 animate-spin"/> : <UploadCloud className="mr-2"/>}
                                     上傳圖片
                                </Label>
                                {illustrationUrl && (
                                    <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={handleRemoveImage} disabled={isUploading}>
                                        <Trash2 className="h-4 w-4" />
                                        移除圖片
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">建議使用透明背景的 PNG 圖片，上傳後將自動壓縮。</p>
                        </Card>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isSaving || isUploading}>
                        {(isSaving || isUploading) && <Loader2 className="mr-2 animate-spin" />}
                        儲存變更
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
