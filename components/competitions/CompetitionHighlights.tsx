import type {
  CompetitionHighlightMatch,
  CompetitionHighlightsData,
} from "@/src/server/competition-highlights";

type CompetitionHighlightsProps = {
  highlights: CompetitionHighlightsData;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dateFormatter.format(date);
}

function getTeamName(match: CompetitionHighlightMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: CompetitionHighlightMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function MatchCard({ match }: { match: CompetitionHighlightMatch }) {
  return (
    <article className="highlight-match-card">
      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{match.stage}</span>
        <span>{match.status}</span>
      </div>

      <div className="match-teams">
        <span className="match-team">
          {getTeamFlag(match, "home") ? (
            <img
              alt=""
              className="team-flag"
              loading="lazy"
              src={getTeamFlag(match, "home") ?? undefined}
            />
          ) : null}
          <span>{getTeamName(match, "home")}</span>
        </span>

        <span className="match-score">
          {renderScore(match.homeScore, match.awayScore)}
        </span>

        <span className="match-team match-team-away">
          <span>{getTeamName(match, "away")}</span>
          {getTeamFlag(match, "away") ? (
            <img
              alt=""
              className="team-flag"
              loading="lazy"
              src={getTeamFlag(match, "away") ?? undefined}
            />
          ) : null}
        </span>
      </div>

      <div className="highlight-prono-line">
        <span>Ton prono</span>
        <strong>
          {match.ownPrediction
            ? `${match.ownPrediction.homeScore} · ${match.ownPrediction.awayScore}`
            : "Aucun prono"}
        </strong>
      </div>

      {match.canRevealPredictions ? (
        <div className="public-predictions">
          {match.predictions.length === 0 ? (
            <p>Aucun prono enregistré pour ce match.</p>
          ) : (
            match.predictions.map((prediction) => (
              <div className="public-prediction-row" key={prediction.id}>
                <strong>{prediction.user.name}</strong>
                <span>
                  {prediction.homeScore} · {prediction.awayScore}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}

function HighlightSection({
  emptyText,
  matches,
  title,
}: {
  emptyText: string;
  matches: CompetitionHighlightMatch[];
  title: string;
}) {
  return (
    <section className="highlight-panel">
      <div className="section-heading">
        <div>
          <h2 className="badge badge-live">{title}</h2>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="readonly-notice">{emptyText}</p>
      ) : (
        <div className="highlight-match-list">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}

export function CompetitionHighlights({ highlights }: CompetitionHighlightsProps) {
  return (
    <div className="competition-highlights">
      <HighlightSection
        emptyText="Aucun match aujourd'hui."
        matches={highlights.todayMatches}
        title="Matchs du jour"
      />
      <HighlightSection
        emptyText="Aucun prochain match programmé."
        matches={highlights.nextMatches}
        title={highlights.nextTitle ?? "Prochains matchs"}
      />
    </div>
  );
}
