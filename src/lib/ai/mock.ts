import type { Analysis, AnalysisInput } from "./schema";

/**
 * Analyse SIMULÉE, utilisée en mode démo (aucun appel à un service externe).
 * Elle repère des mots-clés dans la transcription pour produire le même JSON
 * que produira le vrai LLM. À remplacer par un appel LLM (voir analyze.ts).
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function sentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function dueInDaysFrom(sentence: string): number {
  const s = norm(sentence);
  if (s.includes("aujourd'hui") || s.includes("ce soir")) return 0;
  if (s.includes("demain")) return 1;
  if (s.includes("fin de semaine") || s.includes("vendredi")) return 3;
  if (s.includes("semaine prochaine")) return 7;
  if (s.includes("quinze jours") || s.includes("15 jours") || s.includes("deux semaines")) return 14;
  if (s.includes("mois prochain") || s.includes("fin du mois")) return 30;
  return 3;
}

const TASK_RULES: { match: RegExp; title: (s: string) => string; priority: "BASSE" | "NORMALE" | "HAUTE" }[] = [
  { match: /devis|proposition tarifaire|tarif/, title: () => "Envoyer une proposition tarifaire", priority: "HAUTE" },
  { match: /catalogue|lookbook/, title: () => "Envoyer le catalogue de la collection", priority: "NORMALE" },
  { match: /echantillon/, title: () => "Faire envoyer les échantillons", priority: "NORMALE" },
  { match: /retard|livraison|litige|reclamation/, title: () => "Vérifier la livraison auprès de la logistique", priority: "HAUTE" },
  { match: /\bplv\b|presentoir|vitrine/, title: () => "Commander la PLV / le présentoir", priority: "BASSE" },
  { match: /rappel|relanc|recontact/, title: () => "Relancer le client", priority: "NORMALE" },
  { match: /rendez-vous|repasser|prochaine visite/, title: () => "Planifier la prochaine visite", priority: "NORMALE" },
];

export function mockAnalyze(input: AnalysisInput): Analysis {
  const text = input.transcript.trim();
  const all = sentences(text);
  const n = norm(text);

  // Résumé : les deux premières phrases.
  const summary = all.slice(0, 2).join(" ") || "Visite client.";

  // Tâches : une par règle déclenchée, avec l'échéance trouvée dans la phrase concernée.
  const tasks: Analysis["tasks"] = [];
  for (const rule of TASK_RULES) {
    const sentence = all.find((s) => rule.match.test(norm(s)));
    if (sentence && !tasks.some((t) => t.title === rule.title(sentence))) {
      tasks.push({
        title: rule.title(sentence),
        details: sentence,
        dueInDays: dueInDaysFrom(sentence),
        priority: rule.priority,
      });
    }
  }

  // Produits : rapprochement avec le catalogue (nom ou catégorie cités) + quantité éventuelle.
  const products: Analysis["products"] = [];
  for (const p of input.products) {
    const nameKey = norm(p.name);
    const found = all.find((s) => norm(s).includes(nameKey));
    if (!found) continue;
    const ns = norm(found);
    // « 40 pièces », « 24 paires » ou « 30 sweats Rando… » (nombre juste avant le nom)
    const firstWord = nameKey.split(" ")[0].replace(/[^a-z0-9]/g, "");
    const qty =
      ns.match(/\b(\d{1,4})\s*(?:pieces|unites|paires|pcs)\b/) ??
      ns.match(new RegExp(`\\b(\\d{1,4})\\s+(?:[a-z']+\\s+){0,2}${firstWord}`));
    const quantity = qty ? Number(qty[1]) : null;
    const intent: "réassort" | "intérêt" | "réclamation" = /retard|defaut|abime|reclamation|probleme/.test(ns)
      ? "réclamation"
      : /reassort|recommander|commande|rupture/.test(ns)
        ? "réassort"
        : "intérêt";
    products.push({ rawLabel: p.name, productId: p.id, quantity, intent });
  }

  // Mises à jour de la fiche client.
  const accountUpdates: Analysis["accountUpdates"] = [];
  if (/mecontent|pas content|pas satisfait|concurren|va arreter|ne veut plus/.test(n) && input.account.status !== "A_RISQUE") {
    accountUpdates.push({ field: "status", label: "Statut du client", newValue: "A_RISQUE" });
  } else if (/premiere commande|nouveau client|ouvre un compte/.test(n) && input.account.status === "PROSPECT") {
    accountUpdates.push({ field: "status", label: "Statut du client", newValue: "ACTIF" });
  }
  const keyFacts = all.filter((s) =>
    /ouverture|agrandi|travaux|nouveau magasin|nouvelle acheteuse|nouvel acheteur|budget|demenage|salon/.test(norm(s)),
  );
  if (keyFacts.length) {
    const today = (input.date ?? new Date()).toLocaleDateString("fr-FR");
    const addition = keyFacts.map((s) => `• ${today} : ${s}`).join("\n");
    accountUpdates.push({
      field: "notes",
      label: "Informations clés",
      newValue: input.account.notes ? `${input.account.notes}\n${addition}` : addition,
    });
  }
  const phone = text.match(/(?:0|\+33 ?)[1-9](?:[ .-]?\d{2}){4}/);
  if (phone) accountUpdates.push({ field: "phone", label: "Téléphone", newValue: phone[0] });

  // Brouillon d'email au contact principal.
  const contact = input.contacts.find((c) => c.isPrimary) ?? input.contacts[0] ?? null;
  const hello = contact ? `Bonjour ${contact.firstName},` : "Bonjour,";
  const points: string[] = [];
  for (const t of tasks) {
    if (t.title.startsWith("Envoyer une proposition")) points.push("je vous prépare la proposition tarifaire dont nous avons parlé ;");
    if (t.title.startsWith("Envoyer le catalogue")) points.push("vous trouverez prochainement le catalogue de la collection ;");
    if (t.title.startsWith("Faire envoyer les échantillons")) points.push("je fais partir les échantillons demandés ;");
    if (t.title.startsWith("Vérifier la livraison")) points.push("je vérifie dès aujourd'hui le point livraison avec notre logistique ;");
    if (t.title.startsWith("Commander la PLV")) points.push("je m'occupe de la PLV pour votre point de vente ;");
  }
  for (const p of products.filter((x) => x.intent === "réassort")) {
    points.push(`réassort ${p.rawLabel}${p.quantity ? ` : ${p.quantity} pièces` : ""} bien noté ;`);
  }
  if (points.length) points[points.length - 1] = points[points.length - 1].replace(/ ;$/, ".");
  const body = [
    hello,
    "",
    `Merci pour votre accueil et pour cet échange${points.length ? ". Comme convenu :" : "."}`,
    ...points.map((p) => `- ${p}`),
    "",
    "Je reste à votre disposition pour toute question.",
    "",
    "Bien cordialement,",
    input.userName,
  ].join("\n");

  return {
    summary,
    email: {
      toContactId: contact?.id ?? null,
      subject: `Suite à notre rendez-vous – ${input.account.name}`,
      body,
    },
    tasks,
    accountUpdates,
    products,
  };
}
