import "server-only";
import {
  ConfidentialClientApplication,
  DistributedCachePlugin,
  type ICacheClient,
  type IPartitionManager,
} from "@azure/msal-node";
import { db } from "@/lib/db";

/**
 * Connexion Microsoft Entra ID (application multi-locataire).
 * Chaque client SalesFlow connecte son propre Microsoft 365 ; l'organisation est retrouvée
 * grâce à l'identifiant de locataire (tenantId) renvoyé par Microsoft.
 */

// Permissions Microsoft Graph déléguées demandées à la connexion (jamais Mail.Send).
export const GRAPH_SCOPES = ["User.Read", "Calendars.Read", "Mail.ReadWrite", "Contacts.Read"];
export const LOGIN_SCOPES = ["openid", "profile", "email", "offline_access", ...GRAPH_SCOPES];

export function microsoftConfigured() {
  return Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);
}

export function redirectUri() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/callback`;
}

/** Cache de jetons stocké en base (table MsalCache), une entrée par compte Microsoft. */
const cacheClient: ICacheClient = {
  async get(key) {
    if (!key) return "";
    const row = await db.msalCache.findUnique({ where: { key } });
    return row?.value ?? "";
  },
  async set(key, value) {
    if (!key) return value;
    await db.msalCache.upsert({ where: { key }, create: { key, value }, update: { value } });
    return value;
  },
};

/**
 * Crée un client MSAL dont le cache est limité au compte indiqué.
 * Un client par requête : aucun jeton d'un utilisateur ne peut fuiter vers un autre.
 */
export function msalClient(homeAccountId?: string | null) {
  const partition: IPartitionManager = {
    getKey: async () => homeAccountId ?? "",
    extractKey: async (account) => account.homeAccountId,
  };
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      authority: "https://login.microsoftonline.com/organizations",
    },
    cache: { cachePlugin: new DistributedCachePlugin(cacheClient, partition) },
  });
}

/** Jeton d'accès Graph pour l'utilisateur connecté (rafraîchi automatiquement par MSAL). */
export async function getGraphToken(homeAccountId: string): Promise<string | null> {
  if (!microsoftConfigured()) return null;
  const client = msalClient(homeAccountId);
  const account = await client.getTokenCache().getAccountByHomeId(homeAccountId);
  if (!account) return null;
  try {
    const result = await client.acquireTokenSilent({ account, scopes: GRAPH_SCOPES });
    return result?.accessToken ?? null;
  } catch {
    return null; // jeton expiré ou révoqué : l'utilisateur devra se reconnecter
  }
}
