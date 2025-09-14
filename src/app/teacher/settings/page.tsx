
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
import { Loader2, ImageOff, X, Percent } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function TeacherSettingsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [platformLogoFile, setPlatformLogoFile] = useState<File | null>(null);
    const [platformLogoPreview, setPlatformLogoPreview] = useState<string | null>(null);
    const [sponsorLogoFiles, setSponsorLogoFiles] = useState<(File | null)[]>(Array(4).fill(null));
    const [sponsorLogoPreviews, setSponsorLogoPreviews] = useState<(string | null)[]>([]);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [fixedDepositRate, setFixedDepositRate] = useState<number | string>('');
    const [loanInterestRate, setLoanInterestRate] = useState<number | string>('');

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig) {
            if (platformLogoPreview === null) setPlatformLogoPreview(platformConfig.platformLogoUrl || null);
            if (sponsorLogoPreviews.length === 0) setSponsorLogoPreviews(platformConfig.sponsorLogoUrls || Array(4).fill(null));
            if (fixedDepositRate === '') setFixedDepositRate((platformConfig.fixedDepositInterestRate || 0) * 100);
            if (loanInterestRate === '') setLoanInterestRate((platformConfig.loanInterestRate || 0) * 100);
        }
    }, [platformConfig, platformLogoPreview, sponsorLogoPreviews.length, fixedDepositRate, loanInterestRate, router, toast]);

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPlatformLogoFile(file);
            setPlatformLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSponsorLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            setSponsorLogoFiles(prev => {
                const newFiles = [...prev];
                newFiles[index] = file;
                return newFiles;
            });
            setSponsorLogoPreviews(prev => {
                const newPreviews = [...prev];
                newPreviews[index] = URL.createObjectURL(file);
                return newPreviews;
            });
        }
    };
  
    const handleRemoveSponsorLogo = (index: number) => {
        setSponsorLogoFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = null;
            return newFiles;
        });
        setSponsorLogoPreviews(prev => {
            const newPreviews = [...prev];
            newPreviews[index] = null;
            return newPreviews;
        });
    }

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            let platformLogoUrl = platformConfig?.platformLogoUrl;
            if (platformLogoFile) {
                platformLogoUrl = await fileToDataUrl(platformLogoFile);
            }

            const newSponsorUrls = [...(platformConfig?.sponsorLogoUrls || Array(4).fill(null))];
            for(let i = 0; i < sponsorLogoFiles.length; i++) {
                const file = sponsorLogoFiles[i];
                if (file) {
                    newSponsorUrls[i] = await fileToDataUrl(file);
                } else {
                    if (sponsorLogoPreviews[i] === null) {
                        newSponsorUrls[i] = null;
                    }
                }
            }
            
            await setPlatformConfig({ 
                platformLogoUrl, 
                sponsorLogoUrls: newSponsorUrls,
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100
            });

            toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: "儲存平台設定時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingSettings(false);
            setPlatformLogoFile(null);
            setSponsorLogoFiles(Array(4).fill(null));
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
                    <CardTitle>平台 Logo 設定</CardTitle>
                    <CardDescription>上傳平台 Logo。此 Logo 將顯示在登入頁面和側邊欄中。建議使用透明背景的 PNG 檔案。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                     <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                        {platformLogoPreview ? (
                            <Image src={platformLogoPreview} alt="Logo Preview" width={128} height={128} className="object-contain rounded-md" />
                        ) : (
                            <span className="text-xs text-muted-foreground">預覽</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>上傳 Logo (PNG)</Label>
                        <div>
                            <Input id="logo-upload" type="file" accept="image/png" onChange={handleLogoFileChange} className="sr-only" />
                            <Label htmlFor="logo-upload" className={buttonVariants({ variant: 'outline' })}>
                                選擇檔案
                            </Label>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>贊助商 Logo 設定</CardTitle>
                    <CardDescription>上傳最多四個贊助商 Logo。這些 Logo 將顯示在頁面底部的頁尾区域。建議使用透明背景的 PNG 檔案，並確保所有 Logo 寬度一致。</CardDescription>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="w-48 h-24 bg-muted rounded-md flex items-center justify-center relative group">
                                {sponsorLogoPreviews[index] ? (
                                    <>
                                      <Image src={sponsorLogoPreviews[index]!} alt={`Sponsor Logo ${index + 1} Preview`} fill className="object-contain p-2" />
                                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveSponsorLogo(index)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <ImageOff className="h-6 w-6"/>
                                        <span className="text-xs">位置 {index + 1}</span>
                                    </div>
                                )}
                            </div>
                             <div className="space-y-2">
                                <Label>Logo {index + 1}</Label>
                                <div>
                                    <Input id={`sponsor-logo-upload-${index}`} type="file" accept="image/png" onChange={(e) => handleSponsorLogoFileChange(e, index)} className="sr-only"/>
                                    <Label htmlFor={`sponsor-logo-upload-${index}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                        選擇檔案
                                    </Label>
                                </div>
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
