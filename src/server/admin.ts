import "server-only";

import { unstable_cache } from "next/cache";

export const getAdminCompetitions = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
      return [];
    }

    const { prisma } = await import("@/src/db/prisma");

    return prisma.competition.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        kind: true,
        status: true,
        apiFootballLeagueId: true,
        apiFootballSeason: true,
        apiFootballLastSyncAt: true,
        externalProvider: true,
        externalCompetitionId: true,
        externalSeason: true,
        externalLastSyncAt: true,
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
      },
    });
  },
  ["admin-competitions"],
  {
    tags: ["admin-competitions", "competitions"],
    revalidate: 60,
  },
);
