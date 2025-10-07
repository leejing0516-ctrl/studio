'use server';
/**
 * @fileOverview A pet evolution AI agent.
 *
 * - evolvePet - A function that handles the pet evolution process.
 * - EvolvePetInput - The input type for the evolvePet function.
 * - EvolvePetOutput - The return type for the evolvePet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvolvePetInputSchema = z.object({
  studentId: z.string().describe('The ID of the student, used as a seed for randomization.'),
  currentPetImage: z.string().describe('The data URI of the current pet image.'),
  evolutionPrompt: z.string().describe('A prompt describing the desired evolution, e.g., "cute baby dragon" or "majestic dragon".'),
});
export type EvolvePetInput = z.infer<typeof EvolvePetInputSchema>;

const EvolvePetOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the newly evolved pet image.'),
});
export type EvolvePetOutput = z.infer<typeof EvolvePetOutputSchema>;

export async function evolvePet(input: EvolvePetInput): Promise<EvolvePetOutput> {
  return evolvePetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evolvePetPrompt',
  input: {schema: EvolvePetInputSchema},
  output: {schema: EvolvePetOutputSchema},
  prompt: `You are an expert creature designer. Your task is to evolve the given creature based on the provided prompt, ensuring the result is unique by using the student's ID as a seed.

Student ID (Seed for uniqueness): {{{studentId}}}
Current Creature: {{media url=currentPetImage}}
Evolution Goal: {{{evolutionPrompt}}}

Based on the current creature and the evolution goal, generate a new image of the evolved creature. The new creature should be a clear and logical evolution of the current one, incorporating the essence of the evolution prompt. Ensure the generated image has a transparent background.
`,
});

const evolvePetFlow = ai.defineFlow(
  {
    name: 'evolvePetFlow',
    inputSchema: EvolvePetInputSchema,
    outputSchema: EvolvePetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
