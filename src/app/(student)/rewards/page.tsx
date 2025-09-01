import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { rewards } from "@/lib/placeholder-data";
import { Coins } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="grid gap-6 animate-in fade-in-0 duration-500">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rewards.map((reward) => (
          <Card key={reward.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <div className="relative h-48 w-full">
              <Image
                src={reward.image}
                alt={reward.name}
                fill
                className="object-cover"
                data-ai-hint="reward item"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <CardHeader>
              <CardTitle>{reward.name}</CardTitle>
              <CardDescription>{reward.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <p className="text-sm text-muted-foreground">庫存只剩下 {reward.stock} 件！</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
              <div className="flex items-center gap-2 font-bold text-lg text-primary">
                <Coins className="h-5 w-5" />
                <span>{reward.cost.toLocaleString()}</span>
              </div>
              <Button disabled={reward.stock === 0}>兌換</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
