import { analysisSchema, type Analysis, type AnalysisInput } from "./schema";
import { mockAnalyze } from "./mock";

/**
 * Point d'entrée unique pour l'analyse d'une note vocale.
 *
 * Aujourd'hui : analyse simulée (mode démo).
 * Phase suivante : appel à un LLM hébergé dans l'UE avec sortie JSON structurée
 * (le schéma `analysisSchema` sert de contrat), puis validation zod ci-dessous.
 */
export async function analyzeNote(input: AnalysisInput): Promise<Analysis> {
  const raw = mockAnalyze(input);

  // Validation systématique : une sortie non conforme n'est jamais proposée telle quelle.
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Sortie IA invalide : ${parsed.error.message}`);
  }

  // Garde-fous : on n'accepte que des identifiants connus (pas d'hallucination d'ID).
  const contactIds = new Set(input.contacts.map((c) => c.id));
  const productIds = new Set(input.products.map((p) => p.id));
  const result = parsed.data;
  if (result.email.toContactId && !contactIds.has(result.email.toContactId)) result.email.toContactId = null;
  for (const p of result.products) if (p.productId && !productIds.has(p.productId)) p.productId = null;

  return result;
}
