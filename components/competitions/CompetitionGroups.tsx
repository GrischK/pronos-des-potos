"use client";

import { useMemo, useState } from "react";

import type { CompetitionGroup } from "@/src/server/competitions";

type CompetitionGroupsProps = {
  groups: CompetitionGroup[];
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

export function CompetitionGroups({ groups }: CompetitionGroupsProps) {
  const [activeGroupName, setActiveGroupName] = useState(groups[0]?.name ?? "");
  const activeGroup = useMemo(
    () => groups.find((group) => group.name === activeGroupName) ?? groups[0],
    [activeGroupName, groups],
  );

  if (!activeGroup) {
    return null;
  }

  return (
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
            <h2>Classement et matchs</h2>
          </div>
          <p>{activeGroup.matches.length} matchs importés sur 6 attendus.</p>
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

        <div className="match-list">
          {activeGroup.matches.length === 0 ? (
            <p>Aucun match importé pour ce groupe.</p>
          ) : (
            activeGroup.matches.map((match) => (
              <article className="match-row" key={match.id}>
                <div className="match-meta">
                  <span>{formatKickoffAt(match.kickoffAt)}</span>
                  <span>{match.stage}</span>
                  {match.externalMatchId ? (
                    <span>API #{match.externalMatchId}</span>
                  ) : null}
                </div>

                <div className="match-teams">
                  <span className="match-team">
                    {match.homeTeam.flagUrl ? (
                      <img
                        alt=""
                        className="team-flag"
                        loading="lazy"
                        src={match.homeTeam.flagUrl}
                      />
                    ) : null}
                    <span>{match.homeTeam.name}</span>
                  </span>

                  <span className="match-score">
                    {renderScore(match.homeScore, match.awayScore)}
                  </span>

                  <span className="match-team match-team-away">
                    <span>{match.awayTeam.name}</span>
                    {match.awayTeam.flagUrl ? (
                      <img
                        alt=""
                        className="team-flag"
                        loading="lazy"
                        src={match.awayTeam.flagUrl}
                      />
                    ) : null}
                  </span>
                </div>

                <span className="match-status">{match.status}</span>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
