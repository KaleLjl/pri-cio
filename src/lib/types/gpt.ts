import { z } from "zod";

// Zod schemas
export const InitialAnalysis = z.object({
  objectDescription: z.string(),
  tradable: z.boolean()
});

export const PriceDescription = z.object({
  description: z.string(),
  price: z.number()
});

// Interface definitions
export interface SearchItem {
  title: string;
  snippet: string;
}

export interface SearchResult {
  snippet: string;
  prices: string[];
}

// Type definitions from Zod schemas
export type InitialAnalysisType = z.infer<typeof InitialAnalysis>;
export type PriceDescriptionType = z.infer<typeof PriceDescription>;