/**
 * Données de démonstration SalesFlow — entièrement fictives.
 * Lancer : npm run db:seed (efface puis recrée les données de l'organisation de démo).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type AccountType, type AccountStatus } from "../src/generated/prisma/client";
import { createAnalyzedNote, validateNote } from "../src/lib/notes";
import { DEMO_TRANSCRIPTS } from "../src/lib/demo/transcripts";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Comptes rendus variés pour l'historique (les clients « à risque » reçoivent la note de réclamation)
const HISTORY = [
  "Point trimestriel avec l'acheteuse. Les T-shirts Stride se vendent bien, 60 pièces à réassortir avant l'été. Elle souhaite recevoir le catalogue de la nouvelle collection.",
  "Visite de routine, magasin bien tenu. La doudoune Summit Down a bien fonctionné cet hiver. Ils préparent l'ouverture d'un deuxième point de vente au printemps. Je repasse le mois prochain.",
  "Rendez-vous avec le gérant pour faire le bilan de la saison. Intérêt pour le short Court Pro et les casquettes Core Cap pour le rayon tennis. Il attend un devis d'ici la fin de semaine.",
  "Échange rapide en boutique. La brassière Studio Bra plaît beaucoup à leur clientèle yoga. Ils voudraient des échantillons de la collection printemps-été, je les fais partir la semaine prochaine.",
  DEMO_TRANSCRIPTS[2],
];

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);
const at = (days: number, hour = 10, minute = 0) => new Date(today.getTime() + days * DAY + (hour * 60 + minute) * 60 * 1000);

async function main() {
  // On conserve le lien avec le locataire Microsoft et les comptes ajoutés à la main (npm run admin)
  const previous = await db.organization.findFirst({ where: { name: "Démo Sportswear" }, include: { users: true } });
  const extraUsers = (previous?.users ?? []).filter((u) => !u.email.endsWith("@demo-sportswear.example"));
  await db.organization.deleteMany({ where: { name: "Démo Sportswear" } });

  const org = await db.organization.create({ data: { name: "Démo Sportswear", entraTenantId: previous?.entraTenantId ?? null } });
  for (const u of extraUsers) {
    await db.user.create({ data: { orgId: org.id, email: u.email, name: u.name, role: u.role, entraObjectId: u.entraObjectId } });
  }

  // ── Utilisateurs : 3 commerciaux + 2 accès direction (format du pilote)
  const mk = (name: string, email: string, role: "SALES" | "MANAGER", region?: string) =>
    db.user.create({ data: { orgId: org.id, name, email, role, region } });
  const julie = await mk("Julie Martin", "julie.martin@demo-sportswear.example", "SALES", "Île-de-France");
  const karim = await mk("Karim Benali", "karim.benali@demo-sportswear.example", "SALES", "Nord-Est");
  const sophie = await mk("Sophie Lefèvre", "sophie.lefevre@demo-sportswear.example", "SALES", "Sud-Ouest");
  const nathalie = await mk("Nathalie Roux", "nathalie.roux@demo-sportswear.example", "MANAGER");
  await mk("Olivier Garnier", "olivier.garnier@demo-sportswear.example", "MANAGER");

  // ── Catalogue (références articles F&O fictives)
  const catalog: [string, string, string][] = [
    ["ART-10021", "Trail Shell", "Veste"],
    ["ART-10034", "Flow", "Legging"],
    ["ART-10047", "Rando Fleece", "Sweat"],
    ["ART-10052", "Stride", "T-shirt running"],
    ["ART-10068", "Summit Down", "Doudoune"],
    ["ART-10073", "Court Pro", "Short tennis"],
    ["ART-10089", "Kids Play", "Survêtement enfant"],
    ["ART-10091", "Core Cap", "Casquette"],
    ["ART-10105", "Aero Run", "Coupe-vent"],
    ["ART-10112", "Studio Bra", "Brassière"],
  ];
  for (const [foItemNumber, name, category] of catalog) {
    await db.product.create({ data: { orgId: org.id, foItemNumber, name, category, collection: "Printemps-Été 2027" } });
  }

  // ── Clients revendeurs
  type A = [string, AccountType, AccountStatus, string, string, string, string, [string, string, string][]];
  const accountsBySales: [typeof julie, A[]][] = [
    [
      julie,
      [
        ["Running Store Bastille", "MAGASIN", "ACTIF", "C-000412", "75011", "Paris", "01 43 55 12 90", [["Claire", "Dubois", "Responsable achats"], ["Hugo", "Petit", "Vendeur"]]],
        ["Sport Avenue", "CHAINE", "ACTIF", "C-000377", "92100", "Boulogne-Billancourt", "01 46 21 78 04", [["Marion", "Leroy", "Acheteuse textile"]]],
        ["Yoga & Co", "MAGASIN", "PROSPECT", "", "75017", "Paris", "", [["Inès", "Moreau", "Gérante"]]],
        ["Outdoor Versailles", "MAGASIN", "A_RISQUE", "C-000298", "78000", "Versailles", "01 39 50 44 17", [["Paul", "Fontaine", "Gérant"]]],
        ["Grands Magasins Sud-Parisien", "CHAINE", "ACTIF", "C-000155", "94000", "Créteil", "01 48 99 30 20", [["Anne", "Girard", "Chef de rayon sport"]]],
      ],
    ],
    [
      karim,
      [
        ["Montagne Équipement", "MAGASIN", "ACTIF", "C-000521", "67000", "Strasbourg", "03 88 32 14 50", [["Luc", "Weber", "Gérant"]]],
        ["Nord Sport Distribution", "DISTRIBUTEUR", "ACTIF", "C-000102", "59000", "Lille", "03 20 54 88 71", [["Sarah", "Lambert", "Directrice achats"], ["Thomas", "Roussel", "Acheteur"]]],
        ["Fit Lorraine", "MAGASIN", "ACTIF", "C-000488", "54000", "Nancy", "03 83 36 22 09", [["Julien", "Marchal", "Gérant"]]],
        ["Reims Running", "MAGASIN", "INACTIF", "C-000310", "51100", "Reims", "03 26 47 10 33", [["Élodie", "Masson", "Gérante"]]],
        ["Vosges Aventure", "MAGASIN", "PROSPECT", "", "88000", "Épinal", "", [["Marc", "Henry", "Gérant"]]],
      ],
    ],
    [
      sophie,
      [
        ["Océan Glisse", "MAGASIN", "ACTIF", "C-000633", "64200", "Biarritz", "05 59 24 61 18", [["Léa", "Etcheverry", "Responsable achats"]]],
        ["Sud-Ouest Sports", "CHAINE", "ACTIF", "C-000219", "33000", "Bordeaux", "05 56 44 90 12", [["Nicolas", "Faure", "Acheteur textile"]]],
        ["Toulouse Tennis Shop", "MAGASIN", "A_RISQUE", "C-000574", "31000", "Toulouse", "05 61 22 35 70", [["Camille", "Blanc", "Gérante"]]],
        ["Pyrénées Rando", "MAGASIN", "ACTIF", "C-000601", "65000", "Tarbes", "05 62 34 77 41", [["Jean", "Durand", "Gérant"]]],
        ["Atlantique Distribution", "DISTRIBUTEUR", "PROSPECT", "", "17000", "La Rochelle", "", [["Chloé", "Robin", "Directrice commerciale"]]],
      ],
    ],
  ];

  const accounts: { id: string; ownerId: string; name: string; status: AccountStatus }[] = [];
  for (const [owner, list] of accountsBySales) {
    for (const [name, type, status, fo, postalCode, city, phone, contacts] of list) {
      const a = await db.account.create({
        data: {
          orgId: org.id,
          ownerId: owner.id,
          name,
          type,
          status,
          foAccountNumber: fo || null,
          postalCode,
          city,
          phone: phone || null,
          notes: status === "A_RISQUE" ? `• Client à surveiller : baisse des commandes sur le dernier trimestre.` : null,
          contacts: {
            create: contacts.map(([firstName, lastName, jobTitle], i) => ({
              firstName,
              lastName,
              jobTitle,
              isPrimary: i === 0,
              email: `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@client-demo.example",
            })),
          },
        },
      });
      accounts.push({ id: a.id, ownerId: owner.id, name, status });
    }
  }
  const byName = (n: string) => accounts.find((a) => a.name === n)!;
  const ofOwner = (id: string) => accounts.filter((a) => a.ownerId === id);

  // ── Historique : visites réalisées + notes validées sur les 5 dernières semaines
  let i = 0;
  for (const sales of [julie, karim, sophie]) {
    for (const [k, acc] of ofOwner(sales.id).entries()) {
      if (k === 4 && sales.id !== julie.id) continue; // quelques clients sans visite récente
      const daysAgo = -(3 + ((k * 7 + i * 3) % 32));
      const visit = await db.visit.create({
        data: { accountId: acc.id, userId: sales.id, type: "VISITE", status: "PLANIFIEE", startsAt: at(daysAgo, 9 + k, 30) },
      });
      const note = await createAnalyzedNote(db, {
        userId: sales.id,
        accountId: acc.id,
        visitId: visit.id,
        transcript: acc.status === "A_RISQUE" ? DEMO_TRANSCRIPTS[1] : HISTORY[(k + i) % HISTORY.length],
        durationSec: 60 + ((k * 37) % 120),
        now: at(daysAgo, 11 + k),
      });
      const full = await db.voiceNote.findUniqueOrThrow({
        where: { id: note.id },
        include: { tasks: true, accountUpdates: true, productMentions: true, emailDraft: true },
      });
      await validateNote(db, note.id, sales.id, {
        email: { keep: true, subject: full.emailDraft!.subject, body: full.emailDraft!.body },
        taskIds: full.tasks.map((t) => t.id),
        updateIds: full.accountUpdates.filter((u) => u.field !== "phone").map((u) => u.id),
        mentionIds: full.productMentions.map((m) => m.id),
      });
      await db.voiceNote.update({ where: { id: note.id }, data: { validatedAt: at(daysAgo, 12 + k) } });
      await db.emailDraft.update({ where: { voiceNoteId: note.id }, data: { status: "BROUILLON_OUTLOOK" } });
      // Les tâches les plus anciennes sont faites
      if (daysAgo < -14) {
        await db.task.updateMany({ where: { voiceNoteId: note.id, status: "A_FAIRE" }, data: { status: "FAITE", completedAt: at(daysAgo + 4) } });
      }
      i++;
    }
  }

  // ── Agenda : visites planifiées aujourd'hui et dans les prochains jours (miroir du calendrier Outlook)
  const plan: [typeof julie, string, number, number, number][] = [
    [julie, "Sport Avenue", 0, 9, 30],
    [julie, "Running Store Bastille", 0, 14, 0],
    [julie, "Yoga & Co", 0, 16, 30],
    [julie, "Outdoor Versailles", 2, 10, 0],
    [karim, "Nord Sport Distribution", 0, 10, 0],
    [karim, "Vosges Aventure", 1, 15, 0],
    [sophie, "Toulouse Tennis Shop", 0, 11, 0],
    [sophie, "Atlantique Distribution", 3, 9, 0],
  ];
  for (const [u, name, d, h, m] of plan) {
    await db.visit.create({ data: { accountId: byName(name).id, userId: u.id, startsAt: at(d, h, m), type: "VISITE" } });
  }

  // ── Une note en attente de validation pour Julie (visite de ce matin)
  const morning = await db.visit.findFirstOrThrow({ where: { userId: julie.id, accountId: byName("Sport Avenue").id, startsAt: at(0, 9, 30) } });
  await createAnalyzedNote(db, {
    userId: julie.id,
    accountId: byName("Sport Avenue").id,
    visitId: morning.id,
    transcript: DEMO_TRANSCRIPTS[0],
    durationSec: 84,
  });

  // ── Tâches confiées par la direction
  await db.task.createMany({
    data: [
      {
        orgId: org.id, title: "Présenter la collection Printemps-Été 2027", details: "Prévoir le lookbook et les prix de gros.",
        assigneeId: karim.id, createdById: nathalie.id, accountId: byName("Reims Running").id, source: "DIRECTION",
        priority: "HAUTE", dueDate: at(-2), status: "A_FAIRE",
      },
      {
        orgId: org.id, title: "Faire le point sur l'encours client", details: "Voir avec la comptabilité avant la prochaine commande.",
        assigneeId: sophie.id, createdById: nathalie.id, accountId: byName("Toulouse Tennis Shop").id, source: "DIRECTION",
        priority: "NORMALE", dueDate: at(4), status: "A_FAIRE",
      },
      {
        orgId: org.id, title: "Relancer pour ouverture de compte", assigneeId: julie.id, createdById: nathalie.id,
        accountId: byName("Yoga & Co").id, source: "DIRECTION", priority: "NORMALE", dueDate: at(1), status: "A_FAIRE",
      },
    ],
  });

  const counts = await Promise.all([db.account.count(), db.visit.count(), db.voiceNote.count(), db.task.count()]);
  console.log(`Démo prête : ${counts[0]} clients, ${counts[1]} visites, ${counts[2]} notes vocales, ${counts[3]} tâches.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
