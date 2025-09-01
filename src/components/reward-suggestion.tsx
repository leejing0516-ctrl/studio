"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getRewardSuggestions } from "@/lib/actions";
import { Wand2, Gift, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  studentPoints: number;
  stockMarketPerformance: string;
};

export default function RewardSuggestion({ studentPoints, stockMarketPerformance }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setIsOpen(true);

    const result = await getRewardSuggestions({
      studentPoints,
      stockMarketPerformance,
    });

    if (result.success && result.data) {
      setSuggestions(result.data.suggestedRewards);
    } else {
      setError(result.error || "An unknown error occurred.");
    }
    setIsLoading(false);
  };

  return (
    <>
      <Button onClick={handleSuggest} disabled={isLoading && isOpen}>
        {isLoading && isOpen ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Ask AI Advisor
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Personalized Suggestions</DialogTitle>
            <DialogDescription>
              Based on your points and market performance, here are some rewards you might like!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 min-h-[150px] flex items-center justify-center">
            {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Thinking...</p>
                </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <ul className="space-y-3">
                {suggestions.map((reward, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Gift className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                    <span>{reward}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
