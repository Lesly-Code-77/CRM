# SalesFlow

Application mobile (PWA) qui transforme la note vocale d'un commercial, dictée après une visite client, en **brouillon d'email Outlook**, **tâches** et **fiche client à jour**. Le commercial valide avant toute exécution. Un **espace direction** suit l'activité de l'équipe et permet de confier des tâches.

> État actuel : **socle MVP en mode démo**. La connexion Microsoft 365 et l'IA sont simulées ; tout le reste (base de données, écrans, validation, tâches, tableau de bord) est réel.

## Démarrer en local

Prérequis : Node.js 20+ et Docker (ou un PostgreSQL 16 déjà installé).

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # variables d'environnement
docker compose up -d        # démarre PostgreSQL
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
src/lib/auth.ts             session (démo) — à remplacer par Entra ID
src/app/app/…               écrans mobiles commerciaux
src/app/direction/…         espace direction
src/app/actions/…           actions serveur (formulaires)
```

## Ce qui est simulé, et où le brancher

| Élément | Aujourd'hui | À faire |
|---|---|---|
| Connexion | choix du profil (`src/lib/auth.ts`, cookie) | Entra ID via MSAL / Auth.js, rôle depuis les groupes Entra |
| Transcription | texte d'exemple modifiable (`NoteRecorder`) | envoi de l'audio à un service UE, suppression de l'audio après transcription |
| Analyse IA | règles par mots-clés (`src/lib/ai/mock.ts`) | appel LLM avec sortie JSON conforme à `analysisSchema` dans `analyze.ts` |
| Email | enregistré comme « validé » | `POST /me/messages` (Graph, Mail.ReadWrite) → brouillon Outlook, jamais d'envoi |
| Agenda | visites en base | synchronisation `Calendars.Read` |
| ERP | n° de compte et références articles F&O stockés | lecture seule Dynamics 365 F&O (phase 2) |

## Déploiement (Azure, région France)

- Azure Database for PostgreSQL – Flexible Server (France Central) → `DATABASE_URL`.
- Azure App Service (Node 20) ou Container Apps : `npm run build`, puis `npm run db:deploy` et `npm start`.
- Définir `TZ=Europe/Paris` pour que « aujourd'hui » corresponde à l'heure française.
- `DEMO_MODE=false` une fois Entra ID branché (désactive la connexion par choix de profil).
