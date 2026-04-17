import { unstable_cache } from "next/cache";

export const getCompetitionsOverview = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) {
      return [];
    }

    const { prisma } = await import("@/src/db/prisma");

    return prisma.competition.findMany({
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            matches: true,
            players: true,
          },
        },
      },
    }).then((competitions) =>
      competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        slug: competition.slug,
        matchCount: competition._count.matches,
        playerCount: competition._count.players,
      })),
    );
  },
  ["competitions-overview"],
  {
    tags: ["competitions"],
    revalidate: 300,
  },
);

export async function getCompetitionBySlug(slug: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  return unstable_cache(
    async () => {
      const { prisma } = await import("@/src/db/prisma");

      return prisma.competition.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          startsAt: true,
          endsAt: true,
        },
      });
    },
    ["competition", slug],
    {
      tags: [`competition:${slug}`],
      revalidate: 300,
    },
  )();
}
