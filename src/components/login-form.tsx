import { ArrowRight, BookUser, User } from "lucide-react";
import Image from "next/image";
import { LoginCard } from "@/components/login-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        <LoginCard
          icon={<User className="w-8 h-8 text-primary" />}
          title="學生登入"
          description="選擇您的班級,並使用老師提供的編號和密碼登入。"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-class">班級</Label>
              <Select>
                <SelectTrigger id="student-class">
                  <SelectValue placeholder="請選擇班級" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class1">一年一班</SelectItem>
                  <SelectItem value="class2">一年二班</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-id">學生座號</Label>
              <Input id="student-id" placeholder="請輸入您的座號 (例如: S001)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">密碼</Label>
              <Input id="student-password" type="password" placeholder="請輸入您的密碼" />
            </div>
            <Button className="w-full">
              登入 <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </LoginCard>

        <LoginCard
          icon={<BookUser className="w-8 h-8 text-primary" />}
          title="老師/校長入口"
          description="管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-account">教師帳號</Label>
              <Select>
                <SelectTrigger id="teacher-account">
                  <SelectValue placeholder="請選擇您的帳號" />
                </Trigger>
                <SelectContent>
                  <SelectItem value="teacher1">王老師</SelectItem>
                  <SelectItem value="teacher2">李老師</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-password">密碼</Label>
              <Input id="teacher-password" type="password" placeholder="請輸入您的密碼" />
            </div>
            <Button variant="secondary" className="w-full">
              以老師身份進入 <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </LoginCard>
      </div>
      
      <footer className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">贊助單位</p>
          <div className="flex justify-center items-center gap-4 md:gap-8 flex-wrap">
            <Image src="https://picsum.photos/seed/esun/120/40" alt="玉山銀行" width={120} height={40} className="grayscale" data-ai-hint="esun bank logo" />
            <Image src="https://picsum.photos/seed/parenting/120/40" alt="親子天下" width={120} height={40} className="grayscale" data-ai-hint="parenting magazine logo" />
            <Image src="https://picsum.photos/seed/kist/100/40" alt="KIST" width={100} height={40} className="grayscale" data-ai-hint="kist school logo" />
            <Image src="https://picsum.photos/seed/tainan/120/40" alt="臺南市政府教育局" width={120} height={40} className="grayscale" data-ai-hint="tainan city government education" />
          </div>
      </footer>
    </>
  )
}
