import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Les commandes Prisma (migrations) passent par la connexion directe si elle existe (Supabase : port 5432),
    // l'application par DATABASE_URL (Supabase : pooler, port 6543).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
