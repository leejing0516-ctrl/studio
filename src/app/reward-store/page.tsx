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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydration } from "@/hooks/use-hydration";

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
  const hasHydrated = useHydration();

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);
  
  if (!hasHydrated || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading...</div>;
  }

  const student = getStudentById(user.id);
  
  if (!student) {
    // This can happen briefly while the student data is being loaded or if there's an inconsistency.
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading student data...</div>;
  }
  
  const studentPoints = student.points;

  const handleRedeem = (rewardId: string) => {
    if (!user) return;
    const result = redeemReward(user.id, rewardId);
    toast({
      title: result.success ? "Success!" : "Uh oh!",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

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
