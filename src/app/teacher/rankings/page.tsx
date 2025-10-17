import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CubeIcon, TagIcon } from "lucide-react";

export default function RankingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center mb-12">
          <svg
            aria-label="Vercel logomark"
            height="32"
            role="img"
            viewBox="0 0 75 65"
            width="38"
            className="mr-4"
          >
            <path
              d="M37.59.25l36.95 64H.64l36.95-64z"
              fill="currentColor"
            ></path>
          </svg>
          <svg
            aria-label="Next.js logotype"
            height="20"
            role="img"
            viewBox="0 0 180 36"
            width="90"
            className="border-l border-foreground/30 pl-4"
          >
            <path
              d="M36.14 36V0h7.2v28.8h17.28V36H36.14zM83.42 36V0h7.2v36h-7.2zM97.82 25.2l-8.64-18-8.64 18h-7.56l12.96-27.9L100.34 36h-7.56l-3.24-6.48h8.28v-4.32zM116.18 36V0h17.28v7.2h-10.08v8.64h8.64v7.2h-8.64v5.76h10.08V36h-17.28zM143.9 36l-14.4-21.6V36h-7.2V0h7.2l14.4 21.6V0h7.2v36h-7.2zM180 36V0h7.2v36h-7.2z"
              fill="currentColor"
            ></path>
            <circle cx="170" cy="33" r="3" fill="currentColor"></circle>
          </svg>
        </div>

        <div className="space-y-4">
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <CubeIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Using App Router</CardTitle>
                <CardDescription>Features available in /app</CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <TagIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Latest Version</CardTitle>
                <CardDescription>15.5.6</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
