"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { CompetitionKind } from "@prisma/client";

import {
  getCompetitionStageLabel,
  isTwoLeggedCompetitionStage,
} from "@/src/domain/competition-stage";
import type {
  CompetitionGroup,
  CompetitionPhase,
  CompetitionScheduleMatch,
} from "@/src/server/competitions";

type CompetitionGroupsProps = {
  competitionKind: CompetitionKind;
  groups: CompetitionGroup[];
  phases: CompetitionPhase[];
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

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function getTeamName(
  match: CompetitionScheduleMatch,
  side: "home" | "away",
) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: CompetitionScheduleMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function sortMatchesByKickoff(matches: CompetitionScheduleMatch[]) {
  return [...matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  );
}

function getPhaseMatchSections(
  competitionKind: CompetitionKind,
  phase: CompetitionPhase,
) {
  const matches = sortMatchesByKickoff(phase.matches);

  if (
    phase.stage === "LEAGUE_STAGE" &&
    matches.some((match) => match.matchday !== null)
  ) {
    const matchesByMatchday = new Map<number, CompetitionScheduleMatch[]>();

    for (const match of matches) {
      const matchday = match.matchday ?? 0;
      matchesByMatchday.set(matchday, [
        ...(matchesByMatchday.get(matchday) ?? []),
        match,
      ]);
    }

    return Array.from(matchesByMatchday.entries())
      .sort(([a], [b]) => a - b)
      .map(([matchday, sectionMatches]) => ({
        id: `matchday-${matchday}`,
        title: matchday > 0 ? `Journée ${matchday}` : "Journée à confirmer",
        matches: sectionMatches,
      }));
  }

  if (
    isTwoLeggedCompetitionStage(competitionKind, phase.stage) &&
    matches.length > 1 &&
    matches.length % 2 === 0
  ) {
    const splitIndex = matches.length / 2;

    return [
      {
        id: "first-leg",
        title: "Matchs aller",
        matches: matches.slice(0, splitIndex),
      },
      {
        id: "second-leg",
        title: "Matchs retour",
        matches: matches.slice(splitIndex),
      },
    ];
  }

  return [
    {
      id: "matches",
      title: "Matchs",
      matches,
    },
  ];
}

function MatchList({ matches }: { matches: CompetitionScheduleMatch[] }) {
  return (
    <div className="match-list">
      {matches.length === 0 ? (
        <p>Aucun match importé pour cette section.</p>
      ) : (
        matches.map((match) => (
          <article className="match-row" key={match.id}>
            <div className="match-meta">
              <span>{formatKickoffAt(match.kickoffAt)}</span>
              <span>{getCompetitionStageLabel(match.stage)}</span>
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

            <span className="match-status">{match.status}</span>
          </article>
        ))
      )}
    </div>
  );
}

export function CompetitionGroups({
  competitionKind,
  groups,
  phases,
}: CompetitionGroupsProps) {
  const stages = useMemo(
    () => [
      ...(groups.length > 0
        ? [
            {
              id: "GROUPS",
              label: "Groupes",
              title: "Phase de groupes",
              kind: "groups" as const,
            },
          ]
        : []),
      ...phases.map((phase) => ({
        id: phase.name,
        label: phase.name,
        title: phase.name,
        kind: "phase" as const,
        phase,
      })),
    ],
    [groups.length, phases],
  );
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeGroupName, setActiveGroupName] = useState(groups[0]?.name ?? "");
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const activeGroup =
    groups.find((group) => group.name === activeGroupName) ?? groups[0];
  const previousStage = stages[activeStageIndex - 1];
  const nextStage = stages[activeStageIndex + 1];

  if (!activeStage) {
    return null;
  }

  return (
    <div className="schedule-browser">
      <div className="phase-pager">
        <button
          aria-label="Phase précédente"
          className="phase-arrow"
          disabled={!previousStage}
          onClick={() => setActiveStageIndex((index) => Math.max(0, index - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={3} />
        </button>
        <div>
          <p className="badge badge-live">{activeStage.label}</p>
          <h2>{activeStage.title}</h2>
        </div>
        <button
          aria-label="Phase suivante"
          className="phase-arrow"
          disabled={!nextStage}
          onClick={() =>
            setActiveStageIndex((index) => Math.min(stages.length - 1, index + 1))
          }
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} strokeWidth={3} />
        </button>
      </div>

      {activeStage.kind === "groups" && activeGroup ? (
        <div className="group-browser">
          <nav aria-label="Groupes" className="group-nav">
            {groups.map((group) => (
              <button
                aria-pressed={group.name === activeGroup.name}
                className="group-nav-button"
                key={group.name}
                onClick={() => setActiveGroupName(group.name)}
                type="button"
              >
                {group.name.replace("Groupe ", "")}
              </button>
            ))}
          </nav>

          <div className="group-panel">
            <div className="section-heading">
              <div>
                <p className="badge badge-live">{activeGroup.name}</p>
              </div>
            </div>

            <div className="standings-table-wrap">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Équipe</th>
                    <th>J</th>
                    <th>G</th>
                    <th>N</th>
                    <th>P</th>
                    <th>Diff</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {activeGroup.standings.map((row) => (
                    <tr key={row.team.name}>
                      <td>
                        <span className="standings-team">
                          {row.team.flagUrl ? (
                            <img
                              alt=""
                              className="team-flag"
                              loading="lazy"
                              src={row.team.flagUrl}
                            />
                          ) : null}
                          <span>{row.team.name}</span>
                        </span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalDifference}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MatchList matches={activeGroup.matches} />
          </div>
        </div>
      ) : null}

      {activeStage.kind === "phase" ? (
        <div className="phase-panel">
          <div className="section-heading">
            <div>
              <p className="badge badge-live">{activeStage.title}</p>
            </div>
          </div>
          {getPhaseMatchSections(competitionKind, activeStage.phase).map((section) => (
            <div className="match-subsection" key={section.id}>
              <div className="match-subsection-header">
                <h3>{section.title}</h3>
                <span>{section.matches.length} matchs</span>
              </div>
              <MatchList matches={section.matches} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
