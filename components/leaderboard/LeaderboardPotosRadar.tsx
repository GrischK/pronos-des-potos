"use client";

import { useEffect, useState } from "react";

import type { LeaderboardRow, LeaderboardTournamentStat } from "@/src/server/leaderboard";
import Link from "next/link";

type RadarPlayer = Pick<
  LeaderboardRow,
  | "userId"
  | "name"
  | "image"
  | "points"
  | "predictedMatches"
  | "exactUnique"
  | "exactShared"
  | "correctOutcome"
  | "missed"
>;

type RadarAxis = {
  key: string;
  label: string;
  rawLabel: (player: RadarPlayer) => string;
  getRawValue: (player: RadarPlayer) => number;
  detail: string;
};

type NormalizedRadarAxis = RadarAxis & {
  value: number;
};

type LeaderboardPotosRadarProps = {
  slug: string;
  players: RadarPlayer[];
  tournamentStats: LeaderboardTournamentStat[];
};

type PlayerProfileBadge = {
  key: string;
  label: string;
  description: string;
  tone: "pitch" | "navy" | "coral" | "mint";
};

const axes: RadarAxis[] = [
  {
    key: "mise-fort",
    label: "Mise",
    rawLabel: (player) => {
      if (player.predictedMatches === 0) {
        return "0 pt/prono";
      }

      return `${formatAverage(player.points / player.predictedMatches)} pt/prono`;
    },
    getRawValue: (player) =>
      player.predictedMatches > 0 ? player.points / player.predictedMatches : 0,
    detail: "Points moyens par prono joué.",
  },
  {
    key: "safe",
    label: "Safe",
    rawLabel: (player) => {
      if (player.predictedMatches === 0) {
        return "0 %";
      }

      return `${formatPercent((player.correctOutcome / player.predictedMatches) * 100)} %`;
    },
    getRawValue: (player) =>
      player.predictedMatches > 0 ? player.correctOutcome / player.predictedMatches : 0,
    detail: "Part des pronos à 1 point.",
  },
  {
    key: "audace",
    label: "Audace",
    rawLabel: (player) => {
      if (player.predictedMatches === 0) {
        return "0 %";
      }

      return `${formatPercent((player.exactUnique / player.predictedMatches) * 100)} %`;
    },
    getRawValue: (player) =>
      player.predictedMatches > 0 ? player.exactUnique / player.predictedMatches : 0,
    detail: "Part des scores exacts uniques.",
  },
  {
    key: "precision",
    label: "Précision",
    rawLabel: (player) => {
      if (player.predictedMatches === 0) {
        return "0 %";
      }

      return `${formatPercent(((player.exactUnique + player.exactShared) / player.predictedMatches) * 100)} %`;
    },
    getRawValue: (player) =>
      player.predictedMatches > 0
        ? (player.exactUnique + player.exactShared) / player.predictedMatches
        : 0,
    detail: "Part des scores exacts totaux.",
  },
];

const chartSize = 320;
const center = chartSize / 2;
const radius = 112;
const labelRadius = 138;
const angleOffset = -Math.PI / 2;
const levels = [0.25, 0.5, 0.75, 1];

const statProfileBadgeDefinitions: Array<{
  key: string;
  label: string;
  description: string;
  tone: PlayerProfileBadge["tone"];
}> = [
  {
    key: "best-unique-exact-total",
    label: "Sniper",
    description: "Meilleur total de scores exacts uniques.",
    tone: "coral",
  },
  {
    key: "best-exact-total",
    label: "Exact",
    description: "Meilleur total de scores exacts.",
    tone: "pitch",
  },
  {
    key: "best-outcome-total",
    label: "Sécurisateur",
    description: "Meilleur total de bons résultats.",
    tone: "navy",
  },
  {
    key: "regularity",
    label: "Régularité",
    description: "Meilleure moyenne de points par journée jouée.",
    tone: "mint",
  },
  {
    key: "best-finish",
    label: "Finisseur",
    description: "Meilleur finish sur les 3 dernières journées.",
    tone: "coral",
  },
  {
    key: "longest-podium",
    label: "Marathonien",
    description: "Plus longue série de podiums de journée.",
    tone: "pitch",
  },
  {
    key: "biggest-climb",
    label: "Remontant",
    description: "Plus forte remontée entre deux journées.",
    tone: "navy",
  },
  {
    key: "perfect-day",
    label: "Journée parfaite",
    description: "Journée sans aucun raté parmi les matchs joués.",
    tone: "mint",
  },
  {
    key: "perfect-participation",
    label: "Fidèle",
    description: "Participation maximale sur la compétition.",
    tone: "mint",
  },
  {
    key: "most-frequent-leader",
    label: "Leader naturel",
    description: "Le plus grand nombre de journées à la première place.",
    tone: "navy",
  },
  {
    key: "most-frequent-last",
    label: "Dernier fréquent",
    description: "Le plus grand nombre de journées à la dernière place.",
    tone: "coral",
  },
  {
    key: "longest-slump",
    label: "Galère",
    description: "Plus longue série de journées terminées dernier.",
    tone: "coral",
  },
  {
    key: "worst-missed-streak",
    label: "Série ratés",
    description: "Plus longue série de matchs consécutifs à 0 point.",
    tone: "navy",
  },
  {
    key: "biggest-drop",
    label: "Chute",
    description: "Plus grosse perte de places entre deux journées.",
    tone: "coral",
  },
  {
    key: "best-unique-exact-streak",
    label: "Série sniper",
    description: "Plus longue série de matchs consécutifs à 4 points.",
    tone: "coral",
  },
  {
    key: "best-exact-streak",
    label: "Série exact",
    description: "Plus longue série de matchs consécutifs à 3 points.",
    tone: "pitch",
  },
  {
    key: "best-outcome-streak",
    label: "Série bon résultat",
    description: "Plus longue série de matchs consécutifs à 1 point.",
    tone: "navy",
  },
];

function formatAverage(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function getAxisPoint(index: number, value: number) {
  const angle = angleOffset + (Math.PI * 2 * index) / axes.length;
  const distance = radius * value;

  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
  };
}

function getPolygonPoints(values: number[]) {
  return values
    .map((value, index) => {
      const point = getAxisPoint(index, value);

      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function getLabelPosition(index: number, radiusValue = labelRadius) {
  const angle = angleOffset + (Math.PI * 2 * index) / axes.length;

  return {
    x: center + Math.cos(angle) * radiusValue,
    y: center + Math.sin(angle) * radiusValue,
  };
}

export function LeaderboardPotosRadar({
  slug,
  players,
  tournamentStats,
}: LeaderboardPotosRadarProps) {
  const orderedPlayers = [...players].sort(
    (a, b) =>
      b.points - a.points ||
      b.predictedMatches - a.predictedMatches ||
      a.name.localeCompare(b.name, "fr"),
  );
  const [selectedUserId, setSelectedUserId] = useState(
    orderedPlayers[0]?.userId ?? null,
  );
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedUserId && orderedPlayers.length > 0) {
      setSelectedUserId(orderedPlayers[0].userId);
      return;
    }

    if (
      selectedUserId &&
      !orderedPlayers.some((player) => player.userId === selectedUserId)
    ) {
      setSelectedUserId(orderedPlayers[0]?.userId ?? null);
    }
  }, [orderedPlayers, selectedUserId]);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");

    const syncLayout = () => {
      setIsCompactLayout(mediaQuery.matches);
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
    };
  }, []);
  const selectedPlayer =
    orderedPlayers.find((player) => player.userId === selectedUserId) ??
    orderedPlayers[0] ??
    null;

  if (!selectedPlayer) {
    return null;
  }

  const maxByAxis = axes.map((axis) =>
    Math.max(...orderedPlayers.map((player) => axis.getRawValue(player)), 0),
  );
  const normalizedAxes: NormalizedRadarAxis[] = axes.map((axis, axisIndex) => ({
    ...axis,
    value:
      maxByAxis[axisIndex] > 0
        ? (axis.getRawValue(selectedPlayer) / maxByAxis[axisIndex]) * 100
        : 0,
  }));
  const selectedValues = normalizedAxes.map((axis) => axis.value / 100);
  const styleRank = normalizedAxes
    .map((axis) => ({ key: axis.key, value: axis.value }))
    .sort((a, b) => b.value - a.value)[0]?.key;
  const styleBadge: PlayerProfileBadge =
    styleRank === "audace"
      ? {
          key: "style-audacieux",
          label: "Audacieux",
          description: "Il cherche les scores exacts et prend plus de risques que la moyenne.",
          tone: "coral",
        }
      : styleRank === "safe"
        ? {
            key: "style-prudent",
            label: "Prudent",
            description: "Il sécurise souvent les bons résultats avant de viser le gros coup.",
            tone: "navy",
          }
        : styleRank === "precision"
          ? {
              key: "style-precis",
              label: "Précis",
              description: "Il vise juste sur beaucoup de matchs, sans forcément forcer les gros paris.",
              tone: "mint",
            }
          : {
              key: "style-regulier",
              label: "Régulier",
              description: "Un profil équilibré, solide d’une journée à l’autre.",
              tone: "pitch",
        };
  if (selectedPlayer.predictedMatches === 0) {
    styleBadge.label = "Pas encore de référence";
    styleBadge.description = "Il faut au moins un prono scoré pour profiler le style.";
  }

  const labelRadiusValue = isCompactLayout ? 128 : 138;
  const labelOffset = isCompactLayout ? 10 : 0;
  const profileBadges: PlayerProfileBadge[] = statProfileBadgeDefinitions
    .map((definition) => {
      const stat = tournamentStats.find((item) => item.key === definition.key);

      if (!stat) {
        return null;
      }

      if (!stat.leaders.some((leader) => leader.userId === selectedPlayer.userId)) {
        return null;
      }

      return definition;
    })
    .filter((badge): badge is PlayerProfileBadge => badge !== null);
  const defaultProfileKey = profileBadges[0]?.key ?? null;

  const selectedProfile =
    profileBadges.find((badge) => badge.key === selectedProfileKey) ?? profileBadges[0] ?? null;

  useEffect(() => {
    setSelectedProfileKey(defaultProfileKey);
  }, [defaultProfileKey, selectedPlayer.userId]);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-live">Radar des potos</p>
        </div>
        <p>Qui mise fort, qui joue safe, qui est le plus audacieux.</p>
        <p>Ces stats calculées uniquement sur les matchs terminés.</p>
      </div>

      <div className="leaderboard-radar">
        <div className="leaderboard-radar-chart">
          <svg
            aria-label={`Radar du style de jeu pour ${selectedPlayer.name}`}
            className="leaderboard-radar-svg"
            viewBox={`0 0 ${chartSize} ${chartSize}`}
            role="img"
          >
            <defs>
              <linearGradient id="leaderboard-radar-fill" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--pitch)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {levels.map((level) => (
              <polygon
                className="leaderboard-radar-grid"
                key={level}
                points={getPolygonPoints(axes.map(() => level))}
              />
            ))}
            {axes.map((axis, index) => {
              const point = getAxisPoint(index, 1);
              const isHorizontalLabel = index === 1 || index === 3;
              const label = getLabelPosition(index, labelRadiusValue);

              return (
                <g key={axis.key}>
                  <line
                    className="leaderboard-radar-axis"
                    x1={center}
                    x2={point.x}
                    y1={center}
                    y2={point.y}
                  />
                  <text
                    className="leaderboard-radar-label"
                    x={label.x}
                    y={label.y + (isCompactLayout && isHorizontalLabel ? labelOffset : 0)}
                    textAnchor={index === 0 ? "middle" : index === 1 ? "start" : index === 2 ? "middle" : "end"}
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}
            <polygon
              className="leaderboard-radar-area"
              points={getPolygonPoints(selectedValues)}
            />
            {selectedValues.map((value, index) => {
              const point = getAxisPoint(index, value);

              return (
                <circle
                  className="leaderboard-radar-point"
                  cx={point.x}
                  cy={point.y}
                  key={axes[index].key}
                  r="4.5"
                />
              );
            })}
          </svg>
        </div>

        <div
          className="leaderboard-progress-picker leaderboard-radar-picker"
          aria-label="Joueurs du radar"
        >
          {orderedPlayers.map((player) => (
            <button
              aria-pressed={player.userId === selectedUserId}
              className="leaderboard-progress-chip leaderboard-radar-chip"
              data-selected={player.userId === selectedUserId}
              key={player.userId}
              onClick={() => {
                setSelectedUserId(player.userId);
              }}
              type="button"
            >
              <span className="leaderboard-radar-chip-avatar">
                {player.image ? (
                  <img alt="" loading="lazy" src={player.image} />
                ) : (
                  getInitial(player.name)
                )}
              </span>
              <span className="leaderboard-progress-chip-name">{player.name}</span>
            </button>
          ))}
        </div>

        <div className="leaderboard-radar-panel">
          <div className="leaderboard-radar-summary">
            <Link
              aria-label={`Afficher les stats de ${selectedPlayer.name}`}
              className="leaderboard-radar-player leaderboard-radar-player-link"
              href={`/competitions/${slug}/joueurs/${selectedPlayer.userId}?from=stats`}
            >
              <span className="leaderboard-radar-avatar">
                {selectedPlayer.image ? (
                  <img alt="" loading="lazy" src={selectedPlayer.image} />
                ) : (
                  selectedPlayer.name.trim().slice(0, 1).toUpperCase()
                )}
              </span>
              <div>
                <strong>{selectedPlayer.name}</strong>
                <span>{styleBadge.label}</span>
              </div>
            </Link>
            <p>{styleBadge.description}</p>
          </div>

          {profileBadges.length > 0 ? (
            <div className="leaderboard-radar-profiles">
              <div className="leaderboard-radar-profile-chips" aria-label="Profils détectés">
                {profileBadges.map((badge) => (
                  <button
                    aria-pressed={badge.key === selectedProfile?.key}
                    className={`leaderboard-radar-profile-chip leaderboard-radar-profile-chip--${badge.tone}`}
                    data-selected={badge.key === selectedProfile?.key}
                    key={badge.key}
                    onClick={() => {
                      setSelectedProfileKey(badge.key);
                    }}
                    type="button"
                  >
                    {badge.label}
                  </button>
                ))}
              </div>

              {selectedProfile ? (
                <div className="leaderboard-radar-profile-tooltip" role="status">
                  <strong>{selectedProfile.label}</strong>
                  <p>{selectedProfile.description}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="leaderboard-radar-metrics">
            {normalizedAxes.map((axis, index) => (
              <div key={axis.key}>
                <span>{axis.label}</span>
                <strong>{axis.rawLabel(selectedPlayer)}</strong>
                <small>{axis.detail}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
