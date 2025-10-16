"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Stock, Announcement } from "@/lib/types";
import { PlusCircle, Edit, Trash2, Loader2, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useSchoolStore } from "@/store/useSchoolStore";
import { useAuth } from "@/context/AuthContext";


export default function TeacherStocksPage() {
  const { 
    students,
    isLoading, 
    config: platformConfig, 
  } = useSchoolStore();
  const { setStudents, setPlatformConfig, teacher } = useAuth();
  
  const stocks = platformConfig?.stocks || [];

  const { toast } = useToast();
  const router = useRouter();

  // States for Stock Management
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isEditStockDialogOpen, setIsEditStockDialogOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);

  // States for News Management
  const [isAddNewsDialogOpen, setIsAddNewsDialogOpen] = useState(false);
  const [isEditNewsDialogOpen, setIsEditNewsDialogOpen] = useState(false);
  const [newsToEdit, setNewsToEdit] = useState<Announcement | null>(null);
  const [newsToDelete, setNewsToDelete] = useState<Announcement | null>(null);
  
  // States for Marquee Management
  const [marqueeMessages, setMarqueeMessages] = useState<string[]>(Array(10).fill(''));
  const [isSavingMarquee, setIsSavingMarquee] = useState(false);


  useEffect(() => {
    if (teacher && teacher.role !== 'admin') {
        toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
        router.push('/teacher/dashboard');
    }
  }, [teacher, router, toast]);

   useEffect(() => {
    if (platformConfig?.stockMarqueeMessages) {
        const existingMessages = platformConfig.stockMarqueeMessages;
        const newMessages = Array(10).fill('');
        for (let i = 0; i < Math.min(existingMessages.length, 10); i++) {
            newMessages[i] = existingMessages[i];
        }
        setMarqueeMessages(newMessages);
    }
  }, [platformConfig]);

  const teacherName = teacher?.name || '';

  const handleAddStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ticker = (formData.get("ticker") as string).toUpperCase();
    
    if ((stocks || []).some(s => s.ticker === ticker)) {
        toast({ title: "新增失敗", description: `股票代碼 ${ticker} 已存在。`, variant: "destructive" });
        return;
    }

    const newStock: Stock = {
        ticker,
        id: ticker,
        name: formData.get("name") as string,
        price: Number(formData.get("price")),
        marketCap: formData.get("marketCap") as string,
        change: 0,
        changePercent: 0,
    };

    await setPlatformConfig({ stocks: [...(platformConfig?.stocks || []), newStock] });
    setIsAddStockDialogOpen(false);
    toast({ title: "已新增股票", description: `${newStock.name} (${newStock.ticker}) 已新增至市場。`});
  };

  const handleEditStockClick = (stock: Stock) => {
    setStockToEdit(stock);
    setIsEditStockDialogOpen(true);
  };

  const handleUpdateStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stockToEdit) return;
    const formData = new FormData(event.currentTarget);
    
    const updatedStock: Stock = {
        ...stockToEdit,
        name: formData.get("name") as string,
        price: Number(formData.get("price")),
        marketCap: formData.get("marketCap") as string,
    };
    
    await setPlatformConfig({ stocks: (platformConfig?.stocks || []).map(s => s.ticker === updatedStock.ticker ? updatedStock : s) });
    setIsEditStockDialogOpen(false);
    setStockToEdit(null);
    toast({ title: "已更新股票", description: `${updatedStock.name} 的資訊已更新。` });
  };
  
  const handleDeleteStockClick = (stock: Stock) => {
    setStockToDelete(stock);
  };

  const handleConfirmDeleteStock = async () => {
    if (!stockToDelete) return;

    try {
        await setStudents(currentStudents => currentStudents.map(student => ({
            ...student,
            portfolio: (student.portfolio || []).filter(p => p.ticker !== stockToDelete.ticker)
        })));

        await setPlatformConfig({ stocks: (platformConfig?.stocks || []).filter(s => s.ticker !== stockToDelete.ticker) });

        toast({ title: "已刪除股票", description: `已從市場及所有投資組合中移除 ${stockToDelete.name}。`, variant: "destructive" });
    } catch(e) {
        console.error(e)
        toast({ title: "刪除失敗", description: "從學生投資組合中移除股票時發生錯誤。", variant: "destructive" });
    }

    setStockToDelete(null);
  }

  const handleAddNews = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    
    const newNews: Announcement = {
        id: `news-${Date.now()}`,
        title,
        content,
        date: new Date().toISOString(),
        teacherId: teacher?.id || '',
        teacherName: teacherName,
    };

    setPlatformConfig({ stockMarketNews: [...(platformConfig?.stockMarketNews || []), newNews]});
    toast({ title: "股市新聞已發布" });
    setIsAddNewsDialogOpen(false);
  }

  const handleEditNewsClick = (news: Announcement) => {
    setNewsToEdit(news);
    setIsEditNewsDialogOpen(true);
  }

  const handleUpdateNews = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsToEdit) return;

    const formData = new FormData(event.currentTarget);
    const updatedNews: Announcement = {
        ...newsToEdit,
        title: formData.get("title") as string,
        content: formData.get("content") as string,
    };

    const updatedNewsList = (platformConfig?.stockMarketNews || []).map(n => n.id === updatedNews.id ? updatedNews : n);
    setPlatformConfig({ stockMarketNews: updatedNewsList });
    toast({ title: "股市新聞已更新" });
    setIsEditNewsDialogOpen(false);
  }
  
  const handleDeleteNewsClick = (news: Announcement) => {
    setNewsToDelete(news);
  }

  const handleConfirmDeleteNews = () => {
    if (!newsToDelete) return;
    const updatedNewsList = (platformConfig?.stockMarketNews || []).filter(n => n.id !== newsToDelete.id);
    setPlatformConfig({ stockMarketNews: updatedNewsList });
    toast({ title: "新聞已刪除", variant: "destructive" });
    setNewsToDelete(null);
  }

  const handleMarqueeMessageChange = (index: number, value: string) => {
    const newMessages = [...marqueeMessages];
    newMessages[index] = value;
    setMarqueeMessages(newMessages);
  };

  const handleSaveMarquee = async () => {
    setIsSavingMarquee(true);
    try {
        await setPlatformConfig({ stockMarqueeMessages: marqueeMessages });
        toast({ title: "跑馬燈訊息已儲存" });
    } catch(e) {
        toast({ title: "儲存失敗", variant: "destructive" });
    } finally {
        setIsSavingMarquee(false);
    }
  };
  
  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>股票市場管理</CardTitle>
                    <CardDescription>管理虛擬市場中可供學生交易的股票。</CardDescription>
                </div>
                <Button onClick={() => setIsAddStockDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新增股票
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>代碼</TableHead>
                                <TableHead>公司名稱</TableHead>
                                <TableHead>初始價格</TableHead>
                                <TableHead>市值</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stocks.length > 0 ? stocks.map(stock => (
                                <TableRow key={stock.ticker}>
                                    <TableCell>{stock.ticker}</TableCell>
                                    <TableCell>{stock.name}</TableCell>
                                    <TableCell>{Math.round(stock.price).toLocaleString()}</TableCell>
                                    <TableCell>{stock.marketCap}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditStockClick(stock)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog open={!!stockToDelete && stockToDelete.ticker === stock.ticker} onOpenChange={(open) => !open && setStockToDelete(null)}>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteStockClick(stock)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>您確定要下市嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        您確定要將「{stock.name}」從市場上下市嗎？此操作將會把這支股票從所有學生的投資組合中移除。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleConfirmDeleteStock} className={buttonVariants({ variant: "destructive" })}>確定下市</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                    目前沒有股票資料。
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Megaphone />股市新聞管理</CardTitle>
                    <CardDescription>發布可能影響市場的重大消息。</CardDescription>
                </div>
                <Button onClick={() => setIsAddNewsDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    發布新消息
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">發布日期</TableHead>
                                <TableHead>標題</TableHead>
                                <TableHead>內容</TableHead>
                                <TableHead className="text-right w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(platformConfig?.stockMarketNews || []).length > 0 ? (platformConfig?.stockMarketNews || []).map((news) => (
                            <TableRow key={news.id}>
                                <TableCell>{format(new Date(news.date), "yyyy-MM-dd HH:mm")}</TableCell>
                                <TableCell>{news.title}</TableCell>
                                <TableCell className="max-w-sm truncate">{news.content}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditNewsClick(news)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog open={!!newsToDelete && newsToDelete.id === news.id} onOpenChange={(open) => !open && setNewsToDelete(null)}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteNewsClick(news)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    您確定要刪除新聞「{news.title}」嗎？此操作無法復原。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleConfirmDeleteNews()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">目前沒有股市新聞。</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>跑馬燈訊息管理</CardTitle>
                <CardDescription>在此輸入最多10條您想在股票市場頁面輪播的訊息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marqueeMessages.map((msg, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Label htmlFor={`marquee-${index}`} className="w-12 text-right">{index + 1}.</Label>
                            <Input
                                id={`marquee-${index}`}
                                value={msg}
                                onChange={(e) => handleMarqueeMessageChange(index, e.target.value)}
                                placeholder={`訊息 #${index + 1}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSaveMarquee} disabled={isSavingMarquee}>
                        {isSavingMarquee && <Loader2 className="mr-2 animate-spin" />}
                        儲存跑馬燈訊息
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Dialog for Add Stock */}
        <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddStock}>
                    <DialogHeader>
                        <DialogTitle>新增股票</DialogTitle>
                        <DialogDescription>建立一支持新的股票，讓學生可以進行交易。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="stock-ticker">股票代碼 (Ticker)</Label>
                            <Input id="stock-ticker" name="ticker" placeholder="例如：EDU" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock-name">公司名稱</Label>
                            <Input id="stock-name" name="name" placeholder="例如：學習公司" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock-price">初始價格</Label>
                            <Input id="stock-price" name="price" type="number" placeholder="例如：150" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock-marketCap">市值</Label>
                            <Input id="stock-marketCap" name="marketCap" placeholder="例如：1.2兆" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button type="submit">新增股票</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Dialog for Edit Stock */}
        <Dialog open={isEditStockDialogOpen} onOpenChange={(open) => { if (!open) setStockToEdit(null); setIsEditStockDialogOpen(open); }}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleUpdateStock}>
                    <DialogHeader>
                        <DialogTitle>編輯股票</DialogTitle>
                        <DialogDescription>修改「{stockToEdit?.name}」的詳細資訊。</DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-stock-ticker">股票代碼 (Ticker)</Label>
                            <Input id="edit-stock-ticker" name="ticker" defaultValue={stockToEdit?.ticker} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-stock-name">公司名稱</Label>
                            <Input id="edit-stock-name" name="name" defaultValue={stockToEdit?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-stock-price">目前價格</Label>
                            <Input id="edit-stock-price" name="price" type="number" defaultValue={stockToEdit?.price} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-stock-marketCap">市值</Label>
                            <Input id="edit-stock-marketCap" name="marketCap" defaultValue={stockToEdit?.marketCap} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button type="submit">儲存變更</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Dialog for Add News */}
        <Dialog open={isAddNewsDialogOpen} onOpenChange={setIsAddNewsDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleAddNews}>
                    <DialogHeader>
                        <DialogTitle>發布新的股市新聞</DialogTitle>
                        <DialogDescription>發布一則將會顯示在學生股票市場頁面的新聞。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="news-title">標題</Label>
                            <Input id="news-title" name="title" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="news-content">內容</Label>
                            <Textarea id="news-content" name="content" required rows={5} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button type="submit">發布新聞</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        {/* Dialog for Edit News */}
        <Dialog open={isEditNewsDialogOpen} onOpenChange={(open) => {if (!open) {setNewsToEdit(null)}}}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleUpdateNews}>
                    <DialogHeader>
                        <DialogTitle>編輯新聞</DialogTitle>
                        <DialogDescription>修改「{newsToEdit?.title}」的詳細內容。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-news-title">標題</Label>
                            <Input id="edit-news-title" name="title" defaultValue={newsToEdit?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-news-content">內容</Label>
                            <Textarea id="edit-news-content" name="content" defaultValue={newsToEdit?.content} required rows={5} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button type="submit">儲存變更</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
