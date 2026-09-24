import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Crée un client Prisma à partir d'une URL PostgreSQL (application, seed, outil admin).
 * Bases hébergées (Supabase, Azure) : node-postgres interprète « sslmode » plus strictement
 * que Prisma ; on retire le paramètre et on active TLS explicitement.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL, maxConnections = 10) {
  const url = new URL(connectionString ?? "postgresql://localhost:5432/salesflow");
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("pgbouncer"); // paramètre propre à Prisma, inutile pour node-postgres
  const ssl = sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), ssl, max: maxConnections }) });
}
