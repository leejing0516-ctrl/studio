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
import { type Reward } from "@/store/school-store";
import { useUserStore } from "@/store/user-store";
import { Gem, Ticket, ToyBrick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydration } from "@/hooks/use-hydration";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { type Student } from "@/store/school-store";
import { redeemReward } from "@/lib/firestore-actions";

const rewardIcons = [
    <Ticket key="1" className="w-8 h-8 text-accent" />,
    <Gem key="2" className="w-8 h-8 text-primary" />,
    <ToyBrick key="3" className="w-8 h-8 text-destructive" />,
]

export default function RewardStore() {
  const { user } = useUserStore();
  const { toast } = useToast();
  const router = useRouter();
  const hasHydrated = useHydration();
  const firestore = useFirestore();

  const rewardsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rewards') : null, [firestore]);
  const { data: rewards, isLoading: rewardsLoading } = useCollection<Reward>(rewardsQuery);

  const studentRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'students', user.id) : null, [firestore, user]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);

  useEffect(() => {
    if (hasHydrated && (!user || user.type !== 'student')) {
      router.push("/");
    }
  }, [user, hasHydrated, router]);
  
  const handleRedeem = async (rewardId: string) => {
    if (!user || !student) return;
    const reward = rewards?.find(r => r.id === rewardId);
    if (!reward) return;

    try {
      await redeemReward(user.id, rewardId, student.points, reward.cost);
      toast({
        title: "Success!",
        description: "Reward redeemed successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Uh oh!",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  if (!hasHydrated || studentLoading || rewardsLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading...</div>;
  }
  
  if (!user || user.type !== 'student') {
    // This state will be brief, but it's a good practice to handle it.
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Redirecting...</div>;
  }
  
  if (!student) {
    // This can happen if the student document doesn't exist or there's an error.
    return <div className="flex min-h-screen items-center justify-center bg-light-teal">Loading student data...</div>;
  }
  
  const studentPoints = student.points;

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
