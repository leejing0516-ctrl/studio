import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, School, ArrowRight } from "lucide-react";
import Logo from "@/components/logo";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-12 text-center animate-in fade-in slide-in-from-top duration-700">
        <Logo className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">
          歡迎來到 FinLit 教室
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">學生入口</CardTitle>
            </div>
            <CardDescription>
              訪問您的儀表板、查看您的積分、在股票市場上交易並兌換驚人的獎勵。
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">
                以學生身份進入 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="p-3 bg-accent/10 rounded-full">
                <School className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">老師入口</CardTitle>
            </div>
            <CardDescription>
              管理您的教室、獎勵學生積分以及為獎勵商店補貨。
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/teacher/dashboard" className="w-full">
              <Button className="w-full" variant="outline">
                以老師身份進入 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} FinLit 教室. 版權所有。</p>
      </footer>
    </div>
  );
}
