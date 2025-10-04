
"use client";

import { useState, useContext, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Percent, ImageOff, UploadCloud, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { removeLogo } from "@/lib/actions";
import { useFirebaseStorage } from "@/hooks/use-firebase-storage";

export default function TeacherSettingsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();
    const { uploadFile: uploadStorageFile, isUploading: isUploadingStorage, error: uploadError } = useFirebaseStorage();


    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);


    const [fixedDepositRate, setFixedDepositRate] = useState<number | string>('');
    const [loanInterestRate, setLoanInterestRate] = useState<number | string>('');
    
    // State for image previews
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [sponsorPreviews, setSponsorPreviews] = useState<(string | null)[]>([]);

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig) {
            setFixedDepositRate((platformConfig.fixedDepositInterestRate || 0) * 100);
            setLoanInterestRate((platformConfig.loanInterestRate || 0) * 100);
            setLogoPreview(platformConfig.platformLogoUrl || null);
            setSponsorPreviews(platformConfig.sponsorLogoUrls || [null, null, null, null]);
        }
    }, [platformConfig, router, toast]);

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>, 
        type: 'platform' | 'sponsor', 
        index?: number
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadKey = type === 'platform' ? 'platform' : `sponsor_${index}`;
        setUploadingKey(uploadKey);

        const path = `logos/${uploadKey}_${Date.now()}`;
        const url = await uploadStorageFile(file, path);
        
        setUploadingKey(null);

        if (url) {
            if (type === 'platform') {
                setLogoPreview(url);
            } else if (index !== undefined) {
                const newPreviews = [...sponsorPreviews];
                newPreviews[index] = url;
                setSponsorPreviews(newPreviews);
            }
            toast({ title: "圖片已上傳", description: "預覽圖已更新。請記得點擊下方的「儲存設定」以保存變更。" });
        } else {
             toast({ title: "上傳失敗", description: uploadError || "發生未知錯誤", variant: "destructive" });
        }
    };


    const handleRemoveLogo = async (type: 'platform' | 'sponsor', index?: number) => {
        const key = type === 'platform' ? 'platform' : `sponsor_${index}`;
        setIsRemoving(key);
        try {
            const result = await removeLogo({ type, index });
            if (result.success) {
                toast({ title: "圖片已從資料庫移除" });
                if (type === 'platform') {
                    setLogoPreview(null);
                } else if (index !== undefined) {
                    const newPreviews = [...sponsorPreviews];
                    newPreviews[index] = null;
                    setSponsorPreviews(newPreviews);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ title: "移除失敗", description: error.message, variant: "destructive" });
        } finally {
            setIsRemoving(null);
        }
    }

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await setPlatformConfig({
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100,
                platformLogoUrl: logoPreview,
                sponsorLogoUrls: sponsorPreviews,
            });
            toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: error.message || "儲存平台設定時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingSettings(false);
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>一般設定</CardTitle>
                    <CardDescription>管理平台的核心參數。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="fixed-deposit-rate" className="font-semibold">定存日利率</Label>
                            <p className="text-xs text-muted-foreground">
                                設定學生定期存款的每日利率。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                             <Input 
                                id="fixed-deposit-rate" 
                                type="number" 
                                value={fixedDepositRate}
                                onChange={(e) => setFixedDepositRate(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-24"
                                step="0.01"
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="loan-interest-rate" className="font-semibold">貸款日利率</Label>
                            <p className="text-xs text-muted-foreground">
                                設定學生信用貸款的每日利率。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                             <Input 
                                id="loan-interest-rate" 
                                type="number" 
                                value={loanInterestRate}
                                onChange={(e) => setLoanInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-24"
                                step="0.01"
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>平台 Logo</CardTitle>
                    <CardDescription>上傳新的 Logo 來取代目前的平台 Logo (檔案上限 2MB)。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                     <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Logo Preview" width={128} height={128} className="object-contain rounded-md" />
                        ) : (
                            <ImageOff className="h-10 w-10 text-muted-foreground"/>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Input id="logo-upload" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'platform')} className="hidden" disabled={!!uploadingKey} />
                        <Label htmlFor="logo-upload" className={buttonVariants({ variant: "outline", disabled: !!uploadingKey })}>
                            {uploadingKey === 'platform' ? <Loader2 className="mr-2 animate-spin"/> : <UploadCloud className="mr-2"/>} 
                             上傳圖片
                        </Label>
                        {logoPreview && (
                            <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={() => handleRemoveLogo('platform')} disabled={isRemoving === 'platform'}>
                                {isRemoving === 'platform' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                移除目前 Logo
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>贊助商 Logo</CardTitle>
                    <CardDescription>上傳最多四個贊助商 Logo，將會顯示在登入頁面 (每個檔案上限 2MB)。</CardDescription>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="w-48 h-24 bg-muted rounded-md flex items-center justify-center relative group">
                                {sponsorPreviews[index] ? (
                                    <Image src={sponsorPreviews[index]!} alt={`Sponsor Logo ${index + 1} Preview`} fill className="object-contain p-2" />
                                ) : (
                                    <ImageOff className="h-10 w-10 text-muted-foreground"/>
                                )}
                            </div>
                             <div className="space-y-2">
                                <Label>Logo {index + 1}</Label>
                                <Input id={`sponsor-upload-${index}`} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'sponsor', index)} className="hidden" disabled={!!uploadingKey} />
                                <Label htmlFor={`sponsor-upload-${index}`} className={buttonVariants({ variant: "outline", size: "sm", disabled: !!uploadingKey })}>
                                     {uploadingKey === `sponsor_${index}` ? <Loader2 className="mr-2 animate-spin"/> : <UploadCloud className="mr-2"/>}
                                     上傳
                                </Label>
                                {sponsorPreviews[index] && (
                                    <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={() => handleRemoveLogo('sponsor', index)} disabled={isRemoving === `sponsor_${index}`}>
                                        {isRemoving === `sponsor_${index}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                        移除
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
             <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSavingSettings || !!uploadingKey}>
                    {isSavingSettings && <Loader2 className="mr-2 animate-spin" />}
                    儲存設定
                </Button>
            </div>
        </div>
    );
}
