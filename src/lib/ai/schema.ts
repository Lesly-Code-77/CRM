import { z } from "zod";

/**
 * Contrat de sortie de l'IA : c'est le JSON structuré que le LLM devra renvoyer.
 * Toute réponse est validée par ce schéma avant d'être proposée au commercial.
 * Rien n'est exécuté sans validation humaine.
 */
export const analysisSchema = z.object({
  summary: z.string().min(1).describe("Résumé de la visite en 2-3 phrases"),
  email: z.object({
    toContactId: z.string().nullable().describe("Contact destinataire, parmi les contacts connus"),
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1),
        details: z.string().nullable(),
        dueInDays: z.number().int().min(0).max(90),
        priority: z.enum(["BASSE", "NORMALE", "HAUTE"]),
      }),
    )
    .max(8),
  accountUpdates: z
    .array(
      z.object({
        field: z.enum(["notes", "status", "phone"]),
        label: z.string(),
        newValue: z.string().min(1),
      }),
    )
    .max(5),
  products: z
    .array(
      z.object({
        rawLabel: z.string(),
        productId: z.string().nullable(),
        quantity: z.number().int().positive().nullable(),
        intent: z.enum(["réassort", "intérêt", "réclamation"]),
      }),
    )
    .max(15),
});

export type Analysis = z.infer<typeof analysisSchema>;

export type AnalysisInput = {
  transcript: string;
  userName: string;
  date?: Date; // date de la visite (par défaut : maintenant)
  account: {
    name: string;
    status: string;
    notes: string | null;
  };
  contacts: { id: string; firstName: string; lastName: string; isPrimary: boolean }[];
  products: { id: string; name: string; category: string | null; foItemNumber: string }[];
};
