"use client";

import type { CompetitionKind } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  getPlayerPointsToneClass,
  PlayerPointsBadge,
} from "@/components/player/PlayerPointsBadge";
import {
  CountryFilterPicker,
  buildCountryFilterOptions,
  filterMatchesByCountry,
} from "@/components/predictions/CountryFilter";
import { PredictionScheduleBrowser } from "@/components/predictions/PredictionSchedule";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { getLiveMatchStatusLabel, getMatchStatusLabel } from "@/src/domain/match-status";
import type { PublicPredictionMatch } from "@/src/server/all-predictions";

type AllPredictionsScheduleProps = {
  competitionKind: CompetitionKind;
  matches: PublicPredictionMatch[];
  slug: string;
};

const MATCHES_REFRESH_INTERVAL_MS = 30000;

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

function getTeamName(match: PublicPredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: PublicPredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function getResultLabel(status: string) {
  if (status === "LIVE") {
    return "Score live";
  }

  return "Score final";
}

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return <span className="match-status">{getMatchStatusLabel(status)}</span>;
  }

  return (
    <span className="match-status match-live-status">
      <span>{getMatchStatusLabel(status)}</span>
      <span className="live-minute">{getLiveMatchStatusLabel(liveMinute)}</span>
    </span>
  );
}

function getPredictionBadgeClass(points: number | null, status: string) {
  if (status !== "LIVE" && status !== "FINISHED") {
    return "public-prediction-score";
  }

  return `public-prediction-score public-prediction-score--toned ${getPlayerPointsToneClass(points)}`;
}

function AllPredictionsMatchCard({ match }: { match: PublicPredictionMatch }) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;

  return (
    <article className="prediction-row">
      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{getCompetitionStageLabel(match.stage)}</span>
        {renderStatus(match.status, match.liveMinute)}
      </div>

      <div className="prediction-grid">
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

        <div className="prediction-score-block">
          <span className="match-score">
            {formatMatchScoreText(match)}
          </span>
          {hasResult ? (
            <p className="prediction-result">
              {getResultLabel(match.status)}
            </p>
          ) : null}
        </div>

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
        {match.ownPrediction ? (
          <div className="public-prediction-meta">
            <strong
              className={getPredictionBadgeClass(
                match.ownPrediction.points,
                match.status,
              )}
            >
              {match.ownPrediction.homeScore} · {match.ownPrediction.awayScore}
            </strong>
            {match.ownPrediction.points !== null ? (
              <PlayerPointsBadge
                points={match.ownPrediction.points}
                label="Pts"
                className="public-prediction-points"
              />
            ) : null}
          </div>
        ) : (
          <strong>Aucun prono</strong>
        )}
      </div>

      {match.canRevealPredictions ? (
        <details className="live-match-predictions-panel">
          <summary>
            <span>
              <span className="badge badge-warning">Pronos</span>
              <strong>
                {match.predictions.length} participant
                {match.predictions.length > 1 ? "s" : ""}
              </strong>
            </span>
            <span
              aria-hidden="true"
              className="pending-predictions-summary-action"
            >
              <ChevronDown size={18} strokeWidth={3} />
            </span>
          </summary>

          <div className="public-predictions">
            {match.predictions.length === 0 ? (
              <p>Aucun prono enregistré pour ce match.</p>
            ) : (
              match.predictions.map((prediction) => (
                <div className="public-prediction-row" key={prediction.id}>
                  <strong>{prediction.user.name}</strong>
                  <div className="public-prediction-meta">
                    <span
                      className={getPredictionBadgeClass(
                        prediction.points,
                        match.status,
                      )}
                    >
                      {prediction.homeScore} · {prediction.awayScore}
                    </span>
                    {prediction.points !== null ? (
                      <PlayerPointsBadge
                        points={prediction.points}
                        label="Pts"
                        className="public-prediction-points"
                      />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      ) : (
        <p className="readonly-notice">
          Les pronos seront visibles après le coup d'envoi.
        </p>
      )}
    </article>
  );
}

export function AllPredictionsSchedule({
  competitionKind,
  matches: initialMatches,
  slug,
}: AllPredictionsScheduleProps) {
  const [matches, setMatches] = useState(initialMatches);
  const countryOptions = useMemo(() => buildCountryFilterOptions(matches), [matches]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const filteredMatches = useMemo(
    () => filterMatchesByCountry(matches, selectedCountryId),
    [matches, selectedCountryId],
  );

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    let isActive = true;
    let controller: AbortController | null = null;

    const refreshMatches = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      controller?.abort();
      controller = new AbortController();
      const currentController = controller;

      try {
        const response = await fetch(
          `/api/competitions/${encodeURIComponent(slug)}/tous-les-pronos/matches`,
          {
            cache: "no-store",
            signal: currentController.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          matches?: PublicPredictionMatch[];
        };

        if (isActive && Array.isArray(payload.matches)) {
          setMatches(payload.matches);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (controller === currentController) {
          controller = null;
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshMatches();
    }, MATCHES_REFRESH_INTERVAL_MS);
    const refreshVisibleMatches = () => {
      void refreshMatches();
    };

    document.addEventListener("visibilitychange", refreshVisibleMatches);
    window.addEventListener("focus", refreshVisibleMatches);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      controller?.abort();
      document.removeEventListener("visibilitychange", refreshVisibleMatches);
      window.removeEventListener("focus", refreshVisibleMatches);
    };
  }, [slug]);

  return (
    <>
      <CountryFilterPicker
        onPick={setSelectedCountryId}
        options={countryOptions}
        value={selectedCountryId}
      />

      {filteredMatches.length === 0 ? (
        <p>Aucun match pour ce pays.</p>
      ) : (
        <PredictionScheduleBrowser
          competitionKind={competitionKind}
          groupHeading="Les pronos"
          matches={filteredMatches}
          phaseHeading="Les pronos"
          renderMatch={(match) => (
            <AllPredictionsMatchCard key={match.id} match={match} />
          )}
        />
      )}
    </>
  );
}
