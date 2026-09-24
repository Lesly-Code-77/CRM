/**
 * Transcriptions d'exemple utilisées en mode démo, à la place de la vraie
 * transcription de l'audio (qui arrivera avec le service de transcription UE).
 */
export const DEMO_TRANSCRIPTS: string[] = [
  "Visite chez eux ce matin avec la responsable des achats. Les ventes de la veste Trail Shell marchent très bien, ils sont en rupture et veulent recommander 40 pièces. Elle voudrait aussi voir le catalogue de la collection printemps-été, je lui envoie ça la semaine prochaine. Ils ont un projet d'agrandissement du rayon running pour mars. Il faut que je la rappelle vendredi pour caler la quantité définitive.",
  "Rendez-vous avec le gérant. Il n'est pas content, la dernière livraison de leggings Flow est arrivée avec dix jours de retard et il a raté un week-end de soldes. Il regarde ce que fait la concurrence. Je dois vérifier la livraison avec la logistique demain et lui faire une proposition tarifaire pour compenser d'ici la fin de semaine.",
  "Passage rapide en magasin. Bonne rotation sur le sweat Rando Fleece, 24 pièces à réassortir. Ils voudraient un présentoir pour mettre en avant la gamme enfant en vitrine. Nouvelle acheteuse à partir du mois prochain, Mme Laurent. Son numéro : 06 12 34 56 78. Je repasse dans quinze jours.",
];

export function demoTranscriptFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DEMO_TRANSCRIPTS[h % DEMO_TRANSCRIPTS.length];
}
