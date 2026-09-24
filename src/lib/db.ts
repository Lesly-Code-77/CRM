import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

// Une seule instance de Prisma, réutilisée entre les rechargements à chaud en développement.
// En hébergement « serverless » (Netlify), peu de connexions par instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL, process.env.NETLIFY ? 2 : 10);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
