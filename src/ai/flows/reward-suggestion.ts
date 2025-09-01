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
    .describe('The number of points the student currently has.'),
  stockMarketPerformance: z
    .string()
    .describe(
      'A description of the student\'s recent performance in the virtual stock market, including gains, losses, and overall trends.'
    ),
});
export type RewardSuggestionInput = z.infer<typeof RewardSuggestionInputSchema>;

const RewardSuggestionOutputSchema = z.object({
  suggestedRewards: z
    .array(z.string())
    .describe(
      'A list of suggested rewards the student can redeem, tailored to their points and stock market performance.'
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
  prompt: `You are a helpful assistant designed to suggest rewards to students based on their current points and recent stock market performance.

  Suggest rewards that are relevant to the student's interests and achievements. Consider suggesting higher value rewards if they have many points, or suggest stock market related rewards if they've had success in the stock market recently.

Current Points: {{{studentPoints}}}
Stock Market Performance: {{{stockMarketPerformance}}}

Suggest some rewards:
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
