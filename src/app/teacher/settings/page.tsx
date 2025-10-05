
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
import { Loader2, Percent, ImageOff, UploadCloud, Trash2, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { themes, type Theme } from "@/lib/themes";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

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

    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const [fixedDepositRate, setFixedDepositRate] = useState<number | string>('');
    const [loanInterestRate, setLoanInterestRate] = useState<number | string>('');
    const [marketOpenHour, setMarketOpenHour] = useState<number | string>('');
    const [marketCloseHour, setMarketCloseHour] = useState<number | string>('');
    
    const [sponsorPreviews, setSponsorPreviews] = useState<(string | null)[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("default");

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
            setMarketOpenHour(platformConfig.marketOpenHour ?? 9);
            setMarketCloseHour(platformConfig.marketCloseHour ?? 14);
            setSponsorPreviews(platformConfig.sponsorLogoUrls || [null, null, null, null]);
            setSelectedTheme(platformConfig.theme || "default");
        }
    }, [platformConfig, router, toast]);

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>, 
        type: 'sponsor', 
        index?: number
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast({ title: "檔案太大", description: `請選擇小於 ${MAX_FILE_SIZE / 1024 / 1024}MB 的圖片。`, variant: "destructive" });
            return;
        }

        const uploadKey = `sponsor_${index}`;
        setUploadingKey(uploadKey);
        
        try {
            const dataUrl = await fileToDataUrl(file);
            if (index !== undefined) {
                const newPreviews = [...sponsorPreviews];
                newPreviews[index] = dataUrl;
                setSponsorPreviews(newPreviews);
            }
            toast({ title: "圖片已預覽", description: "請記得點擊下方的「儲存設定」以保存變更。" });
        } catch (error) {
            toast({ title: "圖片讀取失敗", variant: "destructive" });
        } finally {
            setUploadingKey(null);
        }
    };

    const handleRemoveLogo = async (type: 'sponsor', index?: number) => {
       if (index !== undefined) {
            const newPreviews = [...sponsorPreviews];
            newPreviews[index] = null;
            setSponsorPreviews(newPreviews);
        }
        toast({ title: "預覽已移除", description: "請儲存設定以讓變更生效。" });
    }

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        
        try {
            await setPlatformConfig({
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100,
                marketOpenHour: Number(marketOpenHour),
                marketCloseHour: Number(marketCloseHour),
                sponsorLogoUrls: sponsorPreviews,
                theme: selectedTheme,
            });

            toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: error.message || "儲存平台設定時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingSettings(false);
        }
    };
    
    const ThemeColorPreview = ({ theme }: { theme: Theme }) => (
        <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.background})` }} />
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.primary})` }} />
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.secondary})` }} />
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.accent})` }} />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>一般設定</CardTitle>
                    <CardDescription>管理平台的核心金融與市場參數。</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
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
                     <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                        <div>
                            <Label htmlFor="market-open-hour" className="font-semibold flex items-center gap-2"><Clock />股市交易時間</Label>
                            <p className="text-xs text-muted-foreground">
                                設定虛擬股票市場的開盤與收盤時間 (24 小時制)。
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Input 
                                    id="market-open-hour" 
                                    type="number" 
                                    value={marketOpenHour}
                                    onChange={(e) => setMarketOpenHour(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-20"
                                    min="0" max="23"
                                />
                                <span className="text-muted-foreground">點 (開盤)</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Input 
                                    id="market-close-hour" 
                                    type="number" 
                                    value={marketCloseHour}
                                    onChange={(e) => setMarketCloseHour(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-20"
                                    min="0" max="23"
                                />
                                <span className="text-muted-foreground">點 (收盤)</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>外觀設定</CardTitle>
                    <CardDescription>自訂平台的視覺風格與顏色主題。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="theme-select" className="font-semibold">顏色主題</Label>
                            <p className="text-xs text-muted-foreground">
                                選擇一個預設的顏色模板來改變整個應用的外觀。
                            </p>
                        </div>
                        <div className="w-48">
                            <select
                                id="theme-select"
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={selectedTheme}
                                onChange={(e) => setSelectedTheme(e.target.value)}
                            >
                                {themes.map((theme) => (
                                    <option key={theme.name} value={theme.name}>
                                        {theme.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                     <div>
                        <Label>主題預覽</Label>
                        <div className="p-4 rounded-lg border flex flex-wrap gap-4">
                            {themes.map((theme) => (
                                <div key={theme.name} className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        id={`theme-${theme.name}`}
                                        name="theme"
                                        value={theme.name}
                                        checked={selectedTheme === theme.name}
                                        onChange={(e) => setSelectedTheme(e.target.value)}
                                        className="h-4 w-4"
                                    />
                                    <label htmlFor={`theme-${theme.name}`} className="flex flex-col cursor-pointer">
                                        <span className="text-sm font-medium">{theme.label}</span>
                                        <ThemeColorPreview theme={theme} />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>贊助商 Logo</CardTitle>
                    <CardDescription>上傳最多四個贊助商 Logo，將會顯示在登入頁面。建議尺寸為 288x96 像素，每個檔案上限 1MB。</CardDescription>
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
                                    <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={() => handleRemoveLogo('sponsor', index)} disabled={!!uploadingKey}>
                                        <Trash2 className="h-4 w-4" />
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
                    {(isSavingSettings || !!uploadingKey) && <Loader2 className="mr-2 animate-spin" />}
                    儲存設定
                </Button>
            </div>
        </div>
    );
}
