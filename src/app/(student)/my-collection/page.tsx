
"use client";

import { useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { StudentDataContext } from "@/context/StudentDataContext";
import { Gem } from "lucide-react";

export default function MyCollectionPage() {
  const { studentData } = useContext(StudentDataContext);
  const { student } = studentData;

  const redeemedRewards = student?.redeemedRewards || [];

  return (
    <div className="animate-in fade-in-0 duration-500">
      {redeemedRewards.length === 0 ? (
        <Card className="text-center p-12">
            <Gem className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">您的收藏還是空的</CardTitle>
            <CardDescription className="mt-2">
                前往獎勵商店，用您的點數兌換第一個收藏品吧！
            </CardDescription>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {redeemedRewards.map((reward, index) => (
            <Card key={`${reward.id}-${index}`} className="flex flex-col overflow-hidden">
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
              <CardContent>
                <p className="text-sm text-primary font-semibold">已收藏</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
