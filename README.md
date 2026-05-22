# Pronos des potos V2

Application de pronostics multi-competition, pensee pour etre deployee simplement sur Vercel.

## Stack

- Next.js App Router
- Prisma
- Postgres, cible Neon via l'integration Vercel
- Cache Next.js avec invalidation par tags

## Regles de score

- 0 point si le resultat est faux
- 1 point si le resultat est bon mais pas le score exact
- 3 points si le score exact est bon et partage avec au moins un autre joueur
- 4 points si le score exact est bon et unique

## Developpement

```bash
npm install
vercel env pull .env.local
npm run db:migrate
npm run dev
```

`vercel env pull .env.local` recupere les variables du projet Vercel, dont `DATABASE_URL` pour Neon.

Si ton shell garde d'anciennes variables Postgres exportees, purge-les avant de relancer le dev local :

```bash
unset DATABASE_URL
unset POSTGRES_PRISMA_URL
unset DATABASE_URL_UNPOOLED
unset POSTGRES_URL
unset POSTGRES_URL_NON_POOLING
rm -rf .next
npm run dev
```

Verification rapide :

```bash
printenv | grep DATABASE_URL
printenv | grep POSTGRES_PRISMA_URL
printenv | grep POSTGRES_URL
```

## Base de donnees et migrations

Le schema Prisma est dans `prisma/schema.prisma`.

### Creer une migration en developpement

Quand le schema change, lancer :

```bash
npm run db:migrate
```

Cette commande execute `prisma migrate dev`.

Elle sert uniquement au developpement :

- compare `prisma/schema.prisma` avec la base
- cree une nouvelle migration SQL dans `prisma/migrations`
- applique cette migration sur la base de developpement
- regenere le client Prisma si necessaire

Apres chaque migration, committer les fichiers crees :

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add database migration"
```

Ne jamais modifier une migration deja partagee ou deja appliquee en prod. Creer une nouvelle migration a la place.

### Verifier l'etat des migrations

```bash
npx prisma migrate status
```

Cette commande indique si la base est synchronisee avec les migrations presentes dans le repo.

### Appliquer les migrations en production

En production, utiliser :

```bash
npx prisma migrate deploy
```

Cette commande ne cree aucune migration. Elle applique seulement les migrations deja presentes dans `prisma/migrations`.

Regle simple :

```txt
local/dev : npm run db:migrate
prod      : npx prisma migrate deploy
```

### Appliquer les migrations sur la base de production

Quand le code est pousse mais que la base de production n'a pas encore ete mise a jour, il faut appliquer les migrations Prisma sur la vraie DB prod avant de compter sur le nouveau schema.

Procedure recommandeee :

```bash
vercel env pull .env.production.local --environment=production
PRISMA_ENV_FILE=.env.production.local npx prisma migrate deploy
```

Verification rapide de la cible avant execution :

```bash
PRISMA_ENV_FILE=.env.production.local node -e 'require("dotenv").config({ path: process.env.PRISMA_ENV_FILE, override: true }); const redact = (value) => value?.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@"); console.log(redact(process.env.DATABASE_URL)); console.log(redact(process.env.POSTGRES_PRISMA_URL));'
```

Puis verifier l'etat :

```bash
PRISMA_ENV_FILE=.env.production.local npx prisma migrate status
```

Important :

- ne pas utiliser `prisma migrate dev` sur la base de production
- garder `.env.local` pour la base de dev
- utiliser `.env.production.local` uniquement pour lancer les migrations prod
- ne pas `source` un fichier `.env` contenant des URLs Postgres avec `&`, le shell les interprete comme des commandes en arriere-plan

## Cron de scores live

Le cron de scores live utilise deux jobs `cron-job.org` :

- un job quotidien qui appelle `/api/cron/live-scores/prepare` vers 00:00, heure de Paris
- un job minute qui appelle `/api/cron/live-scores`, desactive par defaut

Le job quotidien cherche les matchs a suivre dans les prochaines heures, configure le job minute uniquement sur les heures utiles, puis l'active. Apres chaque synchronisation, le job minute se desactive automatiquement s'il n'y a plus de match `SCHEDULED` ou `LIVE` dans la fenetre de suivi.

Variables requises en production :

```txt
CRON_SECRET=...
CRON_JOB_ORG_API_KEY=...
CRON_JOB_ORG_LIVE_SCORES_JOB_ID=...
```

Les deux jobs doivent envoyer l'en-tete HTTP :

```txt
Authorization: Bearer <CRON_SECRET>
```

## Scripts utiles

```bash
npm run typecheck
npm run test
npm run build
npm run db:studio
```
