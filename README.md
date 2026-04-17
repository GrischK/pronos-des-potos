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

## Scripts utiles

```bash
npm run typecheck
npm run test
npm run build
npm run db:studio
```
