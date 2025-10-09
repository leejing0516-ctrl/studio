'use server';
/**
 * @fileOverview An AI flow for creating custom Q-version doll avatars.
 *
 * - createAvatar - A function that handles the avatar generation process.
 * - CreateAvatarInput - The input type for the createAvatar function.
 * - CreateAvatarOutput - The return type for the createAvatar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateRequest } from '@genkit-ai/googleai';

const CreateAvatarInputSchema = z.object({
  hair: z.string().describe('The hair style and color of the avatar.'),
  eyes: z.string().describe('The eye style and color of the avatar.'),
  mouth: z.string().describe('The mouth style of the avatar.'),
  accessory: z.string().describe('Any accessory the avatar is wearing. "no accessory" if none.'),
});
export type CreateAvatarInput = z.infer<typeof CreateAvatarInputSchema>;

const CreateAvatarOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated avatar image.'),
});
export type CreateAvatarOutput = z.infer<typeof CreateAvatarOutputSchema>;

export async function createAvatar(input: CreateAvatarInput): Promise<CreateAvatarOutput> {
  return await createAvatarFlow(input);
}

const promptTemplate = `A cute Q-version clay-style head doll, clay texture, clean white background. 
The features are: {hair}, {eyes}, {mouth}, {accessory}.`;


const createAvatarFlow = ai.defineFlow(
  {
    name: 'createAvatarFlow',
    inputSchema: CreateAvatarInputSchema,
    outputSchema: CreateAvatarOutputSchema,
  },
  async (input) => {
    
    const filledPrompt = promptTemplate
        .replace('{hair}', input.hair)
        .replace('{eyes}', input.eyes)
        .replace('{mouth}', input.mouth)
        .replace('{accessory}', input.accessory);

    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: filledPrompt,
    });
    
    const imageUrl = media.url;
    if (!imageUrl) {
        throw new Error('Image generation failed to return a URL.');
    }

    return { imageUrl };
  }
);
