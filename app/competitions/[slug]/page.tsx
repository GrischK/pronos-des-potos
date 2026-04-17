import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompetitionBySlug } from "@/src/server/competitions";

type CompetitionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page">
      <p className="eyebrow">{competition.kind}</p>
      <h1>{competition.name}</h1>

      <section className="section">
        <div className="grid">
          <Link className="card" href={`/competitions/${competition.slug}/pronos`}>
            <h2>Mes pronos</h2>
            <p>Saisir ou modifier les scores avant verrouillage.</p>
          </Link>
          <Link
            className="card"
            href={`/competitions/${competition.slug}/classement`}
          >
            <h2>Classement</h2>
            <p>Voir les points et le vainqueur de la compétition.</p>
          </Link>
          <Link
            className="card"
            href={`/competitions/${competition.slug}/tous-les-pronos`}
          >
            <h2>Tous les pronos</h2>
            <p>Comparer les choix des potos une fois les matchs verrouillés.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
