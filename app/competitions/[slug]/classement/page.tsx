import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/PageHeader";
import { getLeaderboardData } from "@/src/server/leaderboard";

export const dynamic = "force-dynamic";

type ClassementPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClassementPage({ params }: ClassementPageProps) {
  const { slug } = await params;
  const competition = await getLeaderboardData(slug);

  if (!competition) {
    notFound();
  }

  const leader = competition.rows[0];

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
        eyebrow={competition.kind}
        title={`Classement - ${competition.name}`}
        description="Les points sont calculés sur les matchs terminés avec score officiel."
      />

      <section className="page-section">
        <div className="actions">
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="leaderboard-summary">
          <div>
            <span>Leader</span>
            <strong>{leader?.name ?? "Aucun prono scoré"}</strong>
          </div>
          <div>
            <span>Matchs terminés</span>
            <strong>{competition.finishedMatchCount}</strong>
          </div>
          <div>
            <span>Participants</span>
            <strong>{competition.participantCount}</strong>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="badge badge-live">Points</p>
            <h2>Classement général</h2>
          </div>
          <p>
            1 pt bon résultat, 3 pts score exact, 4 pts score exact unique.
          </p>
        </div>

        {competition.rows.length === 0 ? (
          <p className="readonly-notice">
            Aucun classement pour le moment. Les points apparaîtront après les
            premiers matchs terminés.
          </p>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Joueur</th>
                  <th>Pts</th>
                  <th>Pronos</th>
                  <th>Exact unique</th>
                  <th>Exact</th>
                  <th>Résultat</th>
                  <th>Ratés</th>
                </tr>
              </thead>
              <tbody>
                {competition.rows.map((row, index) => (
                  <tr key={row.userId}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>
                      <strong>{row.points}</strong>
                    </td>
                    <td>{row.predictedMatches}</td>
                    <td>{row.exactUnique}</td>
                    <td>{row.exactShared}</td>
                    <td>{row.correctOutcome}</td>
                    <td>{row.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
