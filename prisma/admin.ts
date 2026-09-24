/**
 * Petit outil d'administration en ligne de commande (en attendant un écran d'admin).
 *
 *   npm run admin -- liste
 *   npm run admin -- locataire <tenantId> [--org "Nom de l'organisation"]
 *   npm run admin -- utilisateur <email> "<Prénom Nom>" <SALES|MANAGER|ADMIN> [--org "…"]
 *
 * L'organisation par défaut est la première créée (en local : « Démo Sportswear »).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function takeOrg(args: string[]) {
  const i = args.indexOf("--org");
  if (i === -1) return { args, orgName: undefined as string | undefined };
  const orgName = args[i + 1];
  return { args: args.filter((_, k) => k !== i && k !== i + 1), orgName };
}

async function findOrg(name?: string) {
  const org = name
    ? await db.organization.findFirst({ where: { name } })
    : await db.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) throw new Error(name ? `Organisation « ${name} » introuvable` : "Aucune organisation : lancez d'abord npm run db:seed");
  return org;
}

async function main() {
  const { args, orgName } = takeOrg(process.argv.slice(2));
  const [cmd, ...rest] = args;

  if (cmd === "liste") {
    const orgs = await db.organization.findMany({ include: { users: { orderBy: { role: "asc" } } } });
    for (const o of orgs) {
      console.log(`\n${o.name}  (locataire Microsoft : ${o.entraTenantId ?? "non relié"})`);
      for (const u of o.users) console.log(`  - ${u.role.padEnd(7)} ${u.name} <${u.email}>${u.entraObjectId ? "  ✓ déjà connecté via Microsoft" : ""}`);
    }
    return;
  }

  if (cmd === "locataire") {
    const [tenantId] = rest;
    if (!/^[0-9a-f-]{36}$/i.test(tenantId ?? "")) throw new Error("Donnez l'identifiant du locataire (Directory / tenant ID, format GUID)");
    const org = await findOrg(orgName);
    await db.organization.update({ where: { id: org.id }, data: { entraTenantId: tenantId.toLowerCase() } });
    console.log(`✓ « ${org.name} » est reliée au locataire ${tenantId}`);
    return;
  }

  if (cmd === "utilisateur") {
    const [email, name, role = "SALES"] = rest;
    if (!email?.includes("@") || !name) throw new Error('Usage : utilisateur <email> "<Prénom Nom>" <SALES|MANAGER|ADMIN>');
    if (!["SALES", "MANAGER", "ADMIN"].includes(role)) throw new Error("Rôle attendu : SALES, MANAGER ou ADMIN");
    const org = await findOrg(orgName);
    const user = await db.user.upsert({
      where: { orgId_email: { orgId: org.id, email: email.toLowerCase() } },
      create: { orgId: org.id, email: email.toLowerCase(), name, role: role as Role },
      update: { name, role: role as Role, active: true },
    });
    console.log(`✓ ${user.name} <${user.email}> a accès à « ${org.name} » en tant que ${user.role}`);
    return;
  }

  console.log("Commandes : liste | locataire <tenantId> | utilisateur <email> \"<Prénom Nom>\" <SALES|MANAGER|ADMIN>  [--org \"…\"]");
}

main()
  .catch((e) => {
    console.error("✗", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
