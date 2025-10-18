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
import { useSchoolStore } from "@/store/school-store";
import { useUserStore } from "@/store/user-store";
import { Gem, Ticket, ToyBrick } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { mockStudentData } from "@/lib/mock-data";


const rewardIcons = [
    <Ticket className="w-8 h-8 text-accent" />,
    <Gem className="w-8 h-8 text-primary" />,
    <ToyBrick className="w-8 h-8 text-destructive" />,
]

export default function RewardStore() {
  const { user } = useUserStore();
  const { rewards, redeemReward, getStudentById } = useSchoolStore();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);
  
  // This is a workaround to ensure we have student data on this page
  // In a real app, you'd have a more robust way of ensuring data is loaded
  const student = user ? getStudentById(user.id) || mockStudentData.find(s => s.id === user.id) : null;
  const studentPoints = student?.points ?? 0;

  const handleRedeem = (rewardId: string) => {
    if (!user) return;
    const result = redeemReward(user.id, rewardId);
    toast({
      title: result.success ? "Success!" : "Uh oh!",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Redirecting...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-light-teal">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">Reward Store</h1>
            <div className="text-lg font-semibold text-primary">
              Your Points:{" "}
              <span className="text-accent font-bold">{studentPoints.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {rewards.map((reward, index) => (
              <Card key={reward.id} className="flex flex-col">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    {rewardIcons[index % rewardIcons.length]}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow text-center">
                  <CardTitle>{reward.name}</CardTitle>
                  <CardDescription className="text-lg font-bold text-primary mt-2">
                    {reward.cost.toLocaleString()} Points
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reward.stock} available
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={studentPoints < reward.cost || reward.stock === 0}
                    className="w-full bg-accent hover:bg-accent/90"
                  >
                    {reward.stock === 0 ? "Out of Stock" : "Redeem"}
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
