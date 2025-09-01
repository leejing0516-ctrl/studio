// This file uses server-side code.
'use server';

/**
 * @fileOverview Provides reward suggestions based on user points and stock market performance.
 *
 * - `suggestRewards` - A function that suggests rewards based on the student's points and recent stock market performance.
 * - `RewardSuggestionInput` - The input type for the `suggestRewards` function.
 * - `RewardSuggestionOutput` - The return type for the `suggestRewards` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewardSuggestionInputSchema = z.object({
  studentPoints: z
    .number()
    .describe('學生目前擁有的點數。'),
  stockMarketPerformance: z
    .string()
    .describe(
      '學生最近在虛擬股票市場的表現描述，包括收益、虧損和整體趨勢。'
    ),
});
export type RewardSuggestionInput = z.infer<typeof RewardSuggestionInputSchema>;

const RewardSuggestionOutputSchema = z.object({
  suggestedRewards: z
    .array(z.string())
    .describe(
      '根據學生的點數和股票市場表現量身定制的建議獎勵清單。'
    ),
});
export type RewardSuggestionOutput = z.infer<typeof RewardSuggestionOutputSchema>;

export async function suggestRewards(
  input: RewardSuggestionInput
): Promise<RewardSuggestionOutput> {
  return rewardSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewardSuggestionPrompt',
  input: {schema: RewardSuggestionInputSchema},
  output: {schema: RewardSuggestionOutputSchema},
  prompt: `你是一位樂於助人的助理，旨在根據學生目前的點數和最近的股市表現為他們建議獎勵。

  建議與學生的興趣和成就相關的獎勵。如果他們有很多點數，可以考慮建議更高價值的獎勵，或者如果他們最近在股市上取得了成功，可以建議與股市相關的獎勵。

目前點數：{{{studentPoints}}}
股市表現：{{{stockMarketPerformance}}}

建議一些獎勵：
`,
});

const rewardSuggestionFlow = ai.defineFlow(
  {
    name: 'rewardSuggestionFlow',
    inputSchema: RewardSuggestionInputSchema,
    outputSchema: RewardSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
