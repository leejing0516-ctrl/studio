

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
import { Loader2, Percent, ImageOff, UploadCloud, Trash2, Clock, Gift, AppWindow, Smartphone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { themes, type Theme } from "@/lib/themes";
import { resizeImage, fileToDataUrl } from "@/lib/image-utils";
import { DEFAULT_LOGO_URL, DEFAULT_APP_ICON_URL } from "@/lib/config";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ThemeColorPreview = ({ theme }: { theme: Theme }) => (
    <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.background})`, border: '1px solid hsl(var(--border))' }} />
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.primary})` }} />
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.secondary})` }} />
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${theme.cssVars.dark.accent})` }} />
    </div>
);


export default function TeacherSettingsPage() {
    const { platformConfig, setPlatformConfig } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const [logoUrl, setLogoUrl] = useState('');
    const [appIconUrl, setAppIconUrl] = useState('');
    const [fixedDepositRate, setFixedDepositRate] = useState<number | string>('');
    const [loanInterestRate, setLoanInterestRate] = useState<number | string>('');
    const [marketOpenHour, setMarketOpenHour] = useState<number | string>('');
    const [marketCloseHour, setMarketCloseHour] = useState<number | string>('');
    const [buKeXingQiuDescription, setBuKeXingQiuDescription] = useState<string>('');
    
    // Daily Reward States
    const [dailyRewardJackpotChance, setDailyRewardJackpotChance] = useState<number | string>('');
    const [dailyRewardJackpotMin, setDailyRewardJackpotMin] = useState<number | string>('');
    const [dailyRewardJackpotMax, setDailyRewardJackpotMax] = useState<number | string>('');
    const [dailyRewardStandardChance, setDailyRewardStandardChance] = useState<number | string>('');
    const [dailyRewardStandardMin, setDailyRewardStandardMin] = useState<number | string>('');
    const [dailyRewardStandardMax, setDailyRewardStandardMax] = useState<number | string>('');

    const [sponsorLogoUrls, setSponsorLogoUrls] = useState<(string | null)[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("default");

    useEffect(() => {
        const role = localStorage.getItem('teacherRole');
        if (role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }

        if (platformConfig) {
            setLogoUrl(platformConfig.logoUrl || DEFAULT_LOGO_URL);
            setAppIconUrl(platformConfig.appIconUrl || DEFAULT_APP_ICON_URL);
            setFixedDepositRate((platformConfig.fixedDepositInterestRate || 0) * 100);
            setLoanInterestRate((platformConfig.loanInterestRate || 0) * 100);
            setMarketOpenHour(platformConfig.marketOpenHour ?? 9);
            setMarketCloseHour(platformConfig.marketCloseHour ?? 14);
            setSponsorLogoUrls(platformConfig.sponsorLogoUrls || [null, null, null, null]);
            setSelectedTheme(platformConfig.theme || "default");
            const defaultBuKeDescription = "「布可星球」是你閱讀成就的殿堂！你在這裡挖掘的每一點能量、每一本書，都是你知識宇宙擴張的證明。\n每個月底，校長會將你「本月挖掘的能量」按照一定的比例，轉換成可以在平台中使用的「點數」，作為對你努力閱讀的實質獎勵。繼續閱讀，讓你的星球更加璀璨吧！";
            setBuKeXingQiuDescription(platformConfig.buKeXingQiuDescription || defaultBuKeDescription);
            
            // Set daily reward states
            setDailyRewardJackpotChance((platformConfig.dailyRewardJackpotChance ?? 0.05) * 100);
            setDailyRewardJackpotMin(platformConfig.dailyRewardJackpotMin ?? 100);
            setDailyRewardJackpotMax(platformConfig.dailyRewardJackpotMax ?? 200);
            setDailyRewardStandardChance((platformConfig.dailyRewardStandardChance ?? 0.75) * 100);
            setDailyRewardStandardMin(platformConfig.dailyRewardStandardMin ?? 10);
            setDailyRewardStandardMax(platformConfig.dailyRewardStandardMax ?? 50);
        }
    }, [platformConfig, router, toast]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadKey = `sponsor_${index}`;
        setUploadingKey(uploadKey);
        
        try {
            const resizedFile = await resizeImage(file, 288, 96);
            const dataUrl = await fileToDataUrl(resizedFile);
            const newUrls = [...sponsorLogoUrls];
            newUrls[index] = dataUrl;
            setSponsorLogoUrls(newUrls);
            toast({ title: "圖片已預覽", description: "請記得點擊下方的「儲存設定」以保存變更。" });
        } catch (error) {
             toast({ title: "圖片處理失敗", variant: "destructive" });
        } finally {
            setUploadingKey(null);
        }
    };

    const handleRemoveLogo = async (index: number) => {
       const newUrls = [...sponsorLogoUrls];
       newUrls[index] = null;
       setSponsorLogoUrls(newUrls);
       toast({ title: "圖片已移除", description: "請儲存設定以讓變更生效。" });
    }

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        
        try {
            const dataToUpdate: Partial<PlatformConfig> = {
                ...platformConfig,
                logoUrl: logoUrl,
                appIconUrl: appIconUrl,
                fixedDepositInterestRate: Number(fixedDepositRate) / 100,
                loanInterestRate: Number(loanInterestRate) / 100,
                marketOpenHour: Number(marketOpenHour),
                marketCloseHour: Number(marketCloseHour),
                sponsorLogoUrls: sponsorLogoUrls,
                theme: selectedTheme,
                buKeXingQiuDescription: buKeXingQiuDescription,
                dailyRewardJackpotChance: Number(dailyRewardJackpotChance) / 100,
                dailyRewardJackpotMin: Number(dailyRewardJackpotMin),
                dailyRewardJackpotMax: Number(dailyRewardJackpotMax),
                dailyRewardStandardChance: Number(dailyRewardStandardChance) / 100,
                dailyRewardStandardMin: Number(dailyRewardStandardMin),
                dailyRewardStandardMax: Number(dailyRewardStandardMax),
            };

            if (selectedTheme === 'custom') {
                dataToUpdate.customTheme = platformConfig?.customTheme;
            } else {
                delete (dataToUpdate as any).customTheme;
            }
            
            await setPlatformConfig(dataToUpdate);

            toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "儲存失敗", description: error.message || "儲存平台設定時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingSettings(false);
        }
    };
    
    useEffect(() => {
        const theme = themes.find(t => t.name === selectedTheme);
        if (theme) {
            Object.entries(theme.cssVars.dark).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, value);
            });
        }
    }, [selectedTheme]);


    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>平台設定</CardTitle>
                    <CardDescription>管理平台的核心金融參數、外觀主題與相關圖示。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">

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
                                    <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                                        <SelectTrigger id="theme-select">
                                            <SelectValue placeholder="選擇主題" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {themes.map((theme) => (
                                                <SelectItem key={theme.name} value={theme.name}>
                                                    {theme.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>主題預覽</Label>
                                <RadioGroup value={selectedTheme} onValueChange={setSelectedTheme} className="p-4 rounded-lg border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {themes.map((theme) => (
                                        <div key={theme.name} className="flex items-center space-x-2">
                                            <RadioGroupItem value={theme.name} id={`theme-${theme.name}`} />
                                            <Label htmlFor={`theme-${theme.name}`} className="flex flex-col cursor-pointer">
                                                <span className="font-medium">{theme.label}</span>
                                                <ThemeColorPreview theme={theme} />
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>一般設定</CardTitle>
                            <CardDescription>管理平台的 Logo、圖示與金融參數。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="logo-url" className="flex items-center gap-2 font-semibold"><AppWindow /> 平台 Logo URL</Label>
                                    <Input id="logo-url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="請貼上 Logo 圖片網址" />
                                    <p className="text-xs text-muted-foreground">此 Logo 將顯示在側邊欄頂部。</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="app-icon-url" className="flex items-center gap-2 font-semibold"><Smartphone /> 手機 App 圖示 URL</Label>
                                    <Input id="app-icon-url" value={appIconUrl} onChange={(e) => setAppIconUrl(e.target.value)} placeholder="請貼上 App 圖示網址" />
                                    <p className="text-xs text-muted-foreground">此圖示將用於手機主畫面，建議為 512x512 像素的方形圖片。</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
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
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>關於布可星球說明</CardTitle>
                            <CardDescription>自訂「布可星球」成就頁面下方的說明文字。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={buKeXingQiuDescription}
                                onChange={(e) => setBuKeXingQiuDescription(e.target.value)}
                                rows={5}
                                placeholder="輸入關於布可星球的說明..."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gift />每日簽到獎勵設定</CardTitle>
                            <CardDescription>設定學生每日簽到時可獲得的隨機點數獎勵。機率加總建議小於 100%，剩餘機率為「銘謝惠顧」。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-lg border p-4">
                                <h3 className="font-semibold mb-2">頭獎 (Jackpot) 設定</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="jackpot-chance">中獎機率</Label>
                                        <div className="flex items-center gap-2">
                                            <Input id="jackpot-chance" type="number" value={dailyRewardJackpotChance} onChange={e => setDailyRewardJackpotChance(e.target.value === '' ? '' : Number(e.target.value))} step="0.1" />
                                            <Percent className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="jackpot-min">最小點數</Label>
                                        <Input id="jackpot-min" type="number" value={dailyRewardJackpotMin} onChange={e => setDailyRewardJackpotMin(e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="jackpot-max">最大點數</Label>
                                        <Input id="jackpot-max" type="number" value={dailyRewardJackpotMax} onChange={e => setDailyRewardJackpotMax(e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <h3 className="font-semibold mb-2">普通獎設定</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="standard-chance">中獎機率</Label>
                                        <div className="flex items-center gap-2">
                                            <Input id="standard-chance" type="number" value={dailyRewardStandardChance} onChange={e => setDailyRewardStandardChance(e.target.value === '' ? '' : Number(e.target.value))} step="1" />
                                            <Percent className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="standard-min">最小點數</Label>
                                        <Input id="standard-min" type="number" value={dailyRewardStandardMin} onChange={e => setDailyRewardStandardMin(e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="standard-max">最大點數</Label>
                                        <Input id="standard-max" type="number" value={dailyRewardStandardMax} onChange={e => setDailyRewardStandardMax(e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>贊助商 Logo</CardTitle>
                            <CardDescription>上傳最多四個贊助商 Logo，將會顯示在登入頁面。上傳後將自動壓縮。</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="w-48 h-24 bg-muted rounded-md flex items-center justify-center relative group">
                                        {sponsorLogoUrls[index] ? (
                                            <Image src={sponsorLogoUrls[index]!} alt={`Sponsor Logo ${index + 1} Preview`} fill className="object-contain p-2" />
                                        ) : (
                                            <ImageOff className="h-10 w-10 text-muted-foreground"/>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Logo {index + 1}</Label>
                                        <Input id={`sponsor-upload-${index}`} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, index)} className="hidden" disabled={!!uploadingKey} />
                                        <Label htmlFor={`sponsor-upload-${index}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                            {uploadingKey === `sponsor_${index}` ? <Loader2 className="mr-2 animate-spin"/> : <UploadCloud className="mr-2"/>}
                                            上傳
                                        </Label>
                                        {sponsorLogoUrls[index] && (
                                            <Button variant="link" size="sm" className="text-destructive h-auto p-0 flex items-center gap-1" onClick={() => handleRemoveLogo(index)} disabled={!!uploadingKey}>
                                                <Trash2 className="h-4 w-4" />
                                                移除
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
             <div className="flex justify-end sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 px-6 -mx-6 -mb-6 border-t">
                <Button onClick={handleSaveSettings} disabled={isSavingSettings || !!uploadingKey}>
                    {(isSavingSettings || !!uploadingKey) && <Loader2 className="mr-2 animate-spin" />}
                    儲存設定
                </Button>
            </div>
        </div>
    );
}
