"use client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSchoolStore, type Reward } from "@/store/school-store";
import { useUserStore } from "@/store/user-store";
import { Gem, Ticket, ToyBrick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useHydration } from "@/hooks/use-hydration";

const rewardIcons = [
    <Ticket key="1" className="w-8 h-8 text-accent" />,
    <Gem key="2" className="w-8 h-8 text-primary" />,
    <ToyBrick key="3" className="w-8 h-8 text-destructive" />,
]

export default function RewardStore() {
  const { user } = useUserStore();
  const { rewards, getStudentById, redeemReward } = useSchoolStore();
  const { toast } = useToast();
  const router = useRouter();
  const hasHydrated = useHydration();

  const student = useMemo(() => {
    if (!user) return null;
    return getStudentById(user.id);
  }, [user, getStudentById]);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== 'student')) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);
  
  const handleRedeem = (rewardId: string) => {
    if (!user) return;
    const result = redeemReward(user.id, rewardId);
    toast({
      title: result.success ? "成功!" : "失敗",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };
  
  if (!hasHydrated || !user || !student) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading...</div>;
  }
  
  if (user.type !== 'student') {
    // This state will be brief, but it's a good practice to handle it.
    return <div className="flex min-h-screen items-center justify-center bg-background">Redirecting...</div>;
  }
  
  const studentPoints = student.points;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">獎勵商店</h1>
            <div className="text-lg font-semibold text-primary">
              您的點數:{" "}
              <span className="text-accent font-bold">{studentPoints.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(rewards || []).map((reward, index) => (
              <Card key={reward.id} className="flex flex-col">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    {rewardIcons[index % rewardIcons.length]}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow text-center">
                  <CardTitle>{reward.name}</CardTitle>
                  <CardDescription className="text-lg font-bold text-primary mt-2">
                    {reward.cost.toLocaleString()} 點
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    剩下 {reward.stock} 個
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={studentPoints < reward.cost || reward.stock === 0}
                    className="w-full bg-accent hover:bg-accent/90"
                  >
                    {reward.stock === 0 ? "已售完" : "兌換"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
