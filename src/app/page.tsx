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
          Welcome to FinLit Classroom
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Your gateway to financial literacy, where learning about money is rewarding and fun!
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
            </div>
            <CardDescription>
              Access your dashboard, check your points, trade on the stock market, and redeem amazing rewards.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">
                Enter as Student <ArrowRight className="ml-2 h-4 w-4" />
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
              <CardTitle className="text-2xl">Teacher Portal</CardTitle>
            </div>
            <CardDescription>
              Manage your classroom, award points to students, and stock the reward store with new items.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/teacher/dashboard" className="w-full">
              <Button className="w-full" variant="outline">
                Enter as Teacher <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} FinLit Classroom. All rights reserved.</p>
      </footer>
    </div>
  );
}
