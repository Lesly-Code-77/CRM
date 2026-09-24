# SalesFlow

Application mobile (PWA) qui transforme la note vocale d'un commercial, dictée après une visite client, en **brouillon d'email Outlook**, **tâches** et **fiche client à jour**. Le commercial valide avant toute exécution. Un **espace direction** suit l'activité de l'équipe et permet de confier des tâches.

> État actuel : socle MVP. La **connexion Microsoft 365** et la création des **brouillons Outlook** sont branchées ; la transcription et l'IA sont encore simulées. Un mode démo (profils fictifs) permet de tester sans compte Microsoft.

## Démarrer en local

Prérequis : Node.js 20+ et Docker (ou un PostgreSQL 16 déjà installé).

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # variables d'environnement (Windows : copy .env.example .env)
docker compose up -d        # démarre PostgreSQL (ou utiliser une base Supabase, voir plus bas)
npm run db:deploy           # crée les tables
npm run db:seed             # charge les données de démo (fictives)
npm run dev                 # http://localhost:3000
```

Sur la page de connexion, choisissez un profil : **Julie Martin** (commerciale, une note l'attend) ou **Nathalie Roux** (direction). Sur téléphone, ouvrez l'adresse de votre PC sur le réseau local et « Ajouter à l'écran d'accueil ».

Commandes utiles :

| Commande | Rôle |
|---|---|
| `npm run db:migrate` | crée une migration après modification de `prisma/schema.prisma` |
| `npm run db:reset` | remet la base à zéro et recharge la démo |
| `npx prisma studio` | explorer les données dans le navigateur |
| `npm run lint` / `npm run typecheck` | vérifications |

## Démo en ligne : Supabase + Netlify

Pour montrer SalesFlow sur smartphone (le micro exige une adresse en HTTPS). Données fictives uniquement : la production restera sur Azure en France.

1. **Supabase** (base de données) : créer un projet en région UE, noter le mot de passe. Bouton **Connect → ORMs → Prisma** : copier `DATABASE_URL` (port 6543) et `DIRECT_URL` (port 5432), ajouter `&sslmode=require` à la fin de chacune.
2. **Depuis le PC**, dans `.env`, coller ces deux adresses, puis :
   ```bash
   npm install
   npm run db:deploy   # crée les tables dans Supabase
   npm run db:seed     # charge la démo (à relancer le matin d'une présentation : les rendez-vous sont « aujourd'hui »)
   ```
3. **Netlify** : *Add new project → Import an existing project → GitHub →* dépôt `CRM`. Réglages détectés automatiquement (`netlify.toml`). Dans *Environment variables*, ajouter `DATABASE_URL` (celle du port 6543), `DEMO_MODE=true`, `DEMO_ACCESS_CODE=<code choisi>`, puis *Deploy*.
4. Ouvrir `https://<site>.netlify.app` sur le téléphone, saisir le code, choisir un profil. « Partager → Sur l'écran d'accueil » pour l'avoir comme une appli.

Chaque *Push* sur GitHub redéploie automatiquement. Un projet Supabase gratuit se met en pause après 7 jours sans activité (le relancer depuis le tableau de bord Supabase).

## Connexion Microsoft 365 (Entra ID)

1. **Azure → Microsoft Entra ID → App registrations → New registration**
   - Types de comptes : *Accounts in any organizational directory (Multitenant)*
   - Redirect URI : plateforme **Web**, `http://localhost:3000/api/auth/callback` (ajouter plus tard l'URL de production)
2. **Certificates & secrets** → nouveau secret. **API permissions** → Microsoft Graph, *Delegated* : `User.Read`, `Calendars.Read`, `Mail.ReadWrite`, `Contacts.Read`, `offline_access`.
3. Dans `.env` : `AZURE_AD_CLIENT_ID` (Application ID) et `AZURE_AD_CLIENT_SECRET` (valeur du secret). Redémarrer `npm run dev`.
4. Relier l'organisation à votre Microsoft 365 et donner accès à votre compte :

```bash
npm run admin -- locataire <Directory (tenant) ID>
npm run admin -- utilisateur prenom.nom@votre-domaine.fr "Prénom Nom" MANAGER   # ou SALES
npm run admin -- liste
```

Seuls les comptes ajoutés ainsi peuvent entrer (le premier login rattache l'identifiant Microsoft au compte). En cas de refus, la page de connexion affiche le locataire et l'email reçus de Microsoft, à copier dans les commandes ci-dessus.

Chez un client, un administrateur Microsoft 365 devra peut-être donner son **consentement administrateur** à SalesFlow (lien affiché par Microsoft lors de la première connexion).

**Sécurité :** le cookie de session contient un jeton aléatoire, seule son empreinte est stockée en base (table `Session`). Les jetons Microsoft sont gardés côté serveur (table `MsalCache`), jamais dans le navigateur. SalesFlow n'a pas la permission `Mail.Send` : il crée des brouillons, l'utilisateur envoie lui-même depuis Outlook.

## Parcours

**Commercial (mobile)** — `/app`
1. *Aujourd'hui* : rendez-vous du jour (miroir du calendrier Outlook), notes à valider, tâches urgentes.
2. *Dicter* : enregistrement au micro → transcription → « Analyser la note ».
3. *Validation* : email modifiable, tâches, mises à jour de fiche et produits cités, chacun cochable. Rien n'est appliqué sans validation.
4. *Clients* et *Tâches* : fiches, historique, contacts, tâches à cocher.

**Direction (ordinateur)** — `/direction`
- Tableau de bord : visites, notes validées, tâches ouvertes/en retard, par commercial ; clients à surveiller ; derniers comptes rendus.
- Tâches : confier une tâche à un commercial, suivre et annuler.
- Clients : portefeuille filtrable par statut, fiche avec historique.

## Organisation du code

```
prisma/schema.prisma        modèle de données (multi-client, identifiants F&O)
prisma/seed.ts              données de démo
src/lib/ai/                 contrat JSON de l'IA (schema.ts), analyse simulée (mock.ts), point d'entrée (analyze.ts)
src/lib/notes.ts            création d'une note analysée, validation, rejet (logique métier)
src/lib/auth.ts             sessions (cookie + table Session)
src/lib/msal.ts             connexion Microsoft, cache de jetons en base
src/lib/graph.ts            appels Microsoft Graph (brouillons Outlook)
src/app/api/auth/…          routes de connexion / retour Microsoft
prisma/admin.ts             outil admin : relier un locataire, ajouter des utilisateurs
src/app/app/…               écrans mobiles commerciaux
src/app/direction/…         espace direction
src/app/actions/…           actions serveur (formulaires)
```

## Ce qui est simulé, et où le brancher

| Élément | Aujourd'hui | À faire |
|---|---|---|
| Connexion | ✅ Entra ID (MSAL, `src/lib/msal.ts`) + profils démo | écran d'administration des utilisateurs |
| Transcription | texte d'exemple modifiable (`NoteRecorder`) | envoi de l'audio à un service UE, suppression de l'audio après transcription |
| Analyse IA | règles par mots-clés (`src/lib/ai/mock.ts`) | appel LLM avec sortie JSON conforme à `analysisSchema` dans `analyze.ts` |
| Email | ✅ brouillon Outlook via Graph (`src/lib/graph.ts`) si connecté avec Microsoft | — |
| Agenda | visites en base | synchronisation `Calendars.Read` |
| ERP | n° de compte et références articles F&O stockés | lecture seule Dynamics 365 F&O (phase 2) |

## Déploiement (Azure, région France)

- Azure Database for PostgreSQL – Flexible Server (France Central) → `DATABASE_URL`.
- Azure App Service (Node 20) ou Container Apps : `npm run build`, puis `npm run db:deploy` et `npm start`.
- Définir `TZ=Europe/Paris` pour que « aujourd'hui » corresponde à l'heure française.
- `DEMO_MODE=false` en production (désactive la connexion par profils fictifs).
- `APP_URL=https://…` et ajouter `https://…/api/auth/callback` dans les Redirect URIs de l'App registration.
- En local, utiliser `npm run dev` : en mode `npm start`, les cookies sont marqués *Secure* et exigent HTTPS (sauf sur localhost).
