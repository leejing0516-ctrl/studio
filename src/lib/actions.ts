"use server";

import { suggestRewards, type RewardSuggestionInput } from "@/ai/flows/reward-suggestion";

export async function getRewardSuggestions(input: RewardSuggestionInput) {
    try {
        const result = await suggestRewards(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("AI 錯誤:", error);
        return { success: false, error: "無法取得獎勵建議。" };
    }
}
