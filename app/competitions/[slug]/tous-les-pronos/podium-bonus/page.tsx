import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getBonusPodiumPageData } from "@/src/server/bonus-podium";

export const dynamic = "force-dynamic";

type PodiumBonusPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPodiumLabel(position: "winner" | "second" | "third") {
  if (position === "winner") {
    return "1er";
  }

  if (position === "second") {
    return "2e";
  }

  return "3e";
}

function getBonusSlots(kind: string) {
  if (kind === "CHAMPIONS_LEAGUE") {
    return [
      { key: "winnerTeamId", label: "Vainqueur" },
      { key: "secondTeamId", label: "Second" },
    ] as const;
  }

  return [
    { key: "winnerTeamId", label: "Vainqueur" },
    { key: "secondTeamId", label: "Second" },
    { key: "thirdTeamId", label: "Troisième" },
  ] as const;
}

function BonusTeamPill({
  label,
  team,
}: {
  label: string;
  team: {
    name: string;
    flagUrl: string | null;
  } | null;
}) {
  return (
    <div className={`bonus-podium-pill${team ? "" : " is-empty"}`}>
      <span className="bonus-podium-pill-label">{label}</span>
      {team ? (
        <span className="bonus-podium-pill-team">
          {team.flagUrl ? (
            <img alt="" className="team-flag" loading="lazy" src={team.flagUrl} />
          ) : null}
          <span>{team.name}</span>
        </span>
      ) : (
        <span className="bonus-podium-pill-empty">Aucun choix</span>
      )}
    </div>
  );
}

export default async function PodiumBonusPage({ params }: PodiumBonusPageProps) {
  const { slug } = await params;
  const competition = await getBonusPodiumPageData(slug);

  if (!competition || !competition.bonusEnabled) {
    notFound();
  }

  const bonusSlots = getBonusSlots(competition.kind);

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={60000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Pronos bonus - ${competition.name}`}
        mobileTitle="Pronos bonus"
        className="competition-subpage-header"
        description="Regarde comment les potos ont pronostiqué le bonus podium."
      />

      <section className="page-section">
        <div className="actions">
          <Link
            className="btn btn-primary competition-back-button"
            href={`/competitions/${slug}/tous-les-pronos`}
          >
            Retour aux pronos
          </Link>
        </div>
      </section>

      <section className="page-section">
        {competition.result ? (
          <div className="bonus-result-panel">
            <p className="bonus-result-panel-eyebrow">Résultat officiel</p>
            <div
              className={`bonus-result-panel-grid${bonusSlots.length === 2 ? " bonus-result-panel-grid--two" : ""}`}
            >
              {bonusSlots.map((slot) => (
                <BonusTeamPill
                  key={slot.key}
                  label={slot.label}
                  team={
                    competition.teams.find(
                      (team) =>
                        team.id === competition.result?.[slot.key],
                    ) ?? null
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bonus-result-panel">
            <p className="bonus-result-panel-eyebrow">Résultat officiel</p>
            <p className="bonus-result-panel-empty">Le podium officiel n'est pas encore renseigné.</p>
          </div>
        )}
      </section>

      <section className="page-section">
        <div className="bonus-podium-list">
          {competition.predictions.length === 0 ? (
            <div className="empty-state">
              <div>
                <strong>Aucun podium enregistré</strong>
                <p>Les potos n'ont pas encore posé leur bonus.</p>
              </div>
            </div>
          ) : (
            competition.predictions.map((prediction) => (
              <article className="bonus-podium-card" key={prediction.id}>
                <div className="bonus-podium-card-head">
                  <div className="bonus-podium-user">
                    {prediction.user.image ? (
                      <img alt="" className="bonus-podium-avatar" loading="lazy" src={prediction.user.image} />
                    ) : (
                      <span className="bonus-podium-avatar bonus-podium-avatar-fallback">
                        {prediction.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <strong>{prediction.user.name}</strong>
                      {competition.result ? (
                        <span>{prediction.points} pts</span>
                      ) : (
                        <span>Pronos bonus podium enregistré</span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`bonus-podium-grid${bonusSlots.length === 2 ? " bonus-podium-grid--two" : ""}`}
                >
                  {bonusSlots.map((slot) => (
                    <BonusTeamPill
                      key={slot.key}
                      label={slot.label}
                      team={prediction[slot.key === "winnerTeamId" ? "winnerTeam" : slot.key === "secondTeamId" ? "secondTeam" : "thirdTeam"]}
                    />
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
