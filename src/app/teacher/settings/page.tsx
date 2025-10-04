
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Percent } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import placeholderImages from '@/lib/placeholder-images.json';

export default function TeacherSettingsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

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
            setFixedDepositRate((platformConfig.fixedDepositInterestRate || 0) * 100);
            setLoanInterestRate((platformConfig.loanInterestRate || 0) * 100);
        }
    }, [platformConfig, router, toast]);


    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await setPlatformConfig({
                // We no longer save image data to firestore. They are static assets.
                platformLogoUrl: placeholderImages.platformLogo.src,
                sponsorLogoUrls: placeholderImages.sponsorLogos.map(logo => logo.src),
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100
            });

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
                    <CardDescription>平台 Logo 目前為靜態資源，若要更換請在專案的 `src/lib/placeholder-images.json` 中修改路徑。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                     <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                        {platformConfig?.platformLogoUrl && (
                            <Image src={platformConfig.platformLogoUrl} alt="Logo Preview" width={128} height={128} className="object-contain rounded-md" />
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>贊助商 Logo</CardTitle>
                    <CardDescription>贊助商 Logo 目前為靜態資源，若要更換請在專案的 `src/lib/placeholder-images.json` 中修改路徑。</CardDescription>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {(platformConfig?.sponsorLogoUrls || []).map((url, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="w-48 h-24 bg-muted rounded-md flex items-center justify-center relative group">
                                {url && (
                                    <Image src={url} alt={`Sponsor Logo ${index + 1} Preview`} fill className="object-contain p-2" />
                                )}
                            </div>
                             <div className="space-y-2">
                                <Label>Logo {index + 1}</Label>
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
