
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
import { Loader2, Percent, ImageOff, UploadCloud } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "@/lib/firebase";

const storage = getStorage(app);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Helper function to upload a file and get its URL
const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

export default function TeacherSettingsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [fixedDepositRate, setFixedDepositRate] = useState<number | string>('');
    const [loanInterestRate, setLoanInterestRate] = useState<number | string>('');
    
    // State for image previews and files
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [sponsorPreviews, setSponsorPreviews] = useState<(string | null)[]>([]);
    const [sponsorFiles, setSponsorFiles] = useState<(File | null)[]>([]);


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

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>, 
        type: 'platform' | 'sponsor', 
        index?: number
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast({ title: "圖片太大", description: "檔案大小不能超過 2MB。", variant: "destructive" });
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        if (type === 'platform') {
            setLogoFile(file);
            setLogoPreview(previewUrl);
        } else if (type === 'sponsor' && index !== undefined) {
            setSponsorFiles(prev => {
                const newFiles = [...prev];
                newFiles[index] = file;
                return newFiles;
            });
            setSponsorPreviews(prev => {
                const newPreviews = [...prev];
                newPreviews[index] = previewUrl;
                return newPreviews;
            });
        }
    };


    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            let platformLogoUrl = platformConfig?.platformLogoUrl || "";
            if (logoFile) {
                platformLogoUrl = await uploadFile(logoFile, `logos/platform_logo_${Date.now()}`);
            }

            const newSponsorLogoUrls = [...(platformConfig?.sponsorLogoUrls || Array(4).fill(null))];
            
            const uploadPromises = sponsorFiles.map((file, index) => {
                if (file) {
                    return uploadFile(file, `logos/sponsor_${index}_${Date.now()}`).then(url => ({ url, index }));
                }
                return null;
            }).filter(p => p !== null) as Promise<{ url: string; index: number }>[];

            if (uploadPromises.length > 0) {
                const settledPromises = await Promise.all(uploadPromises);
                settledPromises.forEach(({ url, index }) => {
                    newSponsorLogoUrls[index] = url;
                });
            }

            await setPlatformConfig({
                platformLogoUrl,
                sponsorLogoUrls: newSponsorLogoUrls,
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100
            });

            // Reset file states
            setLogoFile(null);
            setSponsorFiles([]);

            toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: "儲存平台設定時發生錯誤。", variant: "destructive" });
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
                        <Input id="logo-upload" type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'platform')} className="hidden" />
                        <Label htmlFor="logo-upload" className={buttonVariants({ variant: "outline" })}>
                            <UploadCloud className="mr-2"/> 上傳圖片
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {logoFile ? logoFile.name : "尚未選擇檔案"}
                        </p>
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
                                <Input id={`sponsor-upload-${index}`} type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'sponsor', index)} className="hidden" />
                                <Label htmlFor={`sponsor-upload-${index}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                    <UploadCloud className="mr-2"/> 上傳
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {sponsorFiles[index] ? sponsorFiles[index]?.name : "尚未選擇檔案"}
                                </p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
             <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                    {isSavingSettings && <Loader2 className="mr-2 animate-spin" />}
                    儲存設定
                </Button>
            </div>
        </div>
    );
}
