"use server";

import { suggestRewards, type RewardSuggestionInput } from "@/ai/flows/reward-suggestion";

export async function getRewardSuggestions(input: RewardSuggestionInput) {
    try {
        const result = await suggestRewards(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("AI Error:", error);
        return { success: false, error: "Failed to get reward suggestions." };
    }
}
