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
cp .env.example .env
npm run db:migrate
npm run dev
```

## Scripts utiles

```bash
npm run typecheck
npm run test
npm run build
```
