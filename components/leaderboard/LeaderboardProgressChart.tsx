"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LeaderboardProgressData } from "@/src/server/leaderboard";

type LeaderboardProgressChartProps = {
  currentUserId: string | null;
  data: LeaderboardProgressData;
};

const chartPalette = [
  "#153e75",
  "#2f7d4f",
  "#f05d3f",
  "#c18c2f",
  "#0e7490",
  "#7c3aed",
  "#be123c",
  "#2563eb",
  "#0f766e",
  "#c2410c",
  "#4f46e5",
  "#15803d",
  "#b45309",
  "#9333ea",
  "#1d4ed8",
];

function getPlayerColor(index: number) {
  return chartPalette[index % chartPalette.length];
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function buildLinePath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function splitWorldCupLabel(label: string) {
  const lastSpaceIndex = label.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    return { phase: label, date: "" };
  }

  return {
    phase: label.slice(0, lastSpaceIndex),
    date: label.slice(lastSpaceIndex + 1),
  };
}

function getInterpolatedY(
  points: { x: number; y: number }[],
  targetX: number,
) {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1 || targetX <= points[0].x) {
    return points[0].y;
  }

  const lastPoint = points[points.length - 1];

  if (targetX >= lastPoint.x) {
    return lastPoint.y;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (targetX >= current.x && targetX <= next.x) {
      const distance = next.x - current.x;

      if (distance === 0) {
        return current.y;
      }

      const progress = (targetX - current.x) / distance;

      return current.y + (next.y - current.y) * progress;
    }
  }

  return lastPoint.y;
}

export function LeaderboardProgressChart({
  currentUserId,
  data,
}: LeaderboardProgressChartProps) {
  const chartScrollPadding = 12;
  const playersWithHistory = useMemo(
    () => data.players.filter((player) => player.history.length > 0),
    [data.players],
  );
  const defaultPlayerId =
    playersWithHistory.find((player) => player.userId === currentUserId)?.userId ??
    playersWithHistory[0]?.userId ??
    null;
  const [selectedUserId, setSelectedUserId] = useState(defaultPlayerId);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedPlayer =
    playersWithHistory.find((player) => player.userId === selectedUserId) ??
    playersWithHistory[0] ??
    null;
  const selectedPlayerIndex = selectedPlayer
    ? playersWithHistory.findIndex((player) => player.userId === selectedPlayer.userId)
    : -1;
  const padding = {
    top: 24,
    right: 108,
    bottom: 42,
    left: 34,
  };
  const sectionStep = 132;
  const chartWidth = Math.max(
    360,
    padding.left + padding.right + Math.max(0, data.sections.length - 1) * sectionStep,
  );
  const chartHeight = Math.max(420, data.participantCount * 28);
  const innerWidth = Math.max(1, chartWidth - padding.left - padding.right);
  const innerHeight = Math.max(1, chartHeight - padding.top - padding.bottom);
  const maxRank = Math.max(1, data.participantCount);
  const xStep = data.sections.length > 1 ? sectionStep : 0;
  const yStep = maxRank > 1 ? innerHeight / (maxRank - 1) : 0;
  const selectedPlayerPoints = selectedPlayer
    ? selectedPlayer.history.map((point, pointIndex) => ({
        x: padding.left + pointIndex * xStep,
        y: padding.top + (point.rank - 1) * yStep,
      }))
    : [];
  const trackedViewportX = padding.left + scrollLeft + Math.min(72, Math.max(36, viewportWidth * 0.22));
  const selectedPlayerOverlayY = getInterpolatedY(selectedPlayerPoints, trackedViewportX);
  const selectedPlayerColor = getPlayerColor(selectedPlayerIndex);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const syncMetrics = () => {
      setScrollLeft(element.scrollLeft);
      setViewportWidth(element.clientWidth);
    };

    syncMetrics();

    const resizeObserver = new ResizeObserver(() => {
      syncMetrics();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (data.sections.length === 0 || playersWithHistory.length === 0) {
    return (
      <p className="readonly-notice">
        L&apos;évolution apparaîtra dès que des matchs terminés alimenteront le classement.
      </p>
    );
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-live">Évolution officielle</p>
        </div>
        <p>
          Choisis un participant pour le mettre en avant.
        </p>
      </div>

      <div className="leaderboard-progress-layout">
        <div className="leaderboard-progress-summary">
          {selectedPlayer ? (
            <>
              <Link
                className="leaderboard-progress-active"
                href={`/competitions/${data.slug}/joueurs/${selectedPlayer.userId}?from=graph`}
              >
                <span
                  className="leaderboard-progress-avatar"
                  style={{ backgroundColor: getPlayerColor(selectedPlayerIndex) }}
                >
                  {selectedPlayer.image ? (
                    <img alt="" loading="lazy" src={selectedPlayer.image} />
                  ) : (
                    getInitial(selectedPlayer.name)
                  )}
                </span>
                <div>
                  <strong>{selectedPlayer.name}</strong>
                </div>
              </Link>

              <div className="leaderboard-progress-metrics">
                <div>
                  <span>Rang actuel</span>
                  <strong>
                    {selectedPlayer.currentRank ? `#${selectedPlayer.currentRank}` : "-"}
                  </strong>
                </div>
                <div>
                  <span>Meilleur rang</span>
                  <strong>
                    {selectedPlayer.bestRank ? `#${selectedPlayer.bestRank}` : "-"}
                  </strong>
                </div>
                <div>
                  <span>Points</span>
                  <strong>{selectedPlayer.currentPoints}</strong>
                </div>
              </div>
            </>
          ) : null}

          <div className="leaderboard-progress-picker" aria-label="Joueurs du graphe">
            {playersWithHistory.map((player, index) => {
              const isSelected = player.userId === selectedPlayer?.userId;

              return (
                <button
                  aria-pressed={isSelected}
                  className="leaderboard-progress-chip"
                  data-selected={isSelected ? "true" : "false"}
                  key={player.userId}
                  onClick={() => setSelectedUserId(player.userId)}
                  type="button"
                >
                  <span
                    className="leaderboard-progress-chip-dot"
                    style={{ backgroundColor: getPlayerColor(index) }}
                  />
                  <span className="leaderboard-progress-chip-rank">
                    {player.currentRank ? `#${player.currentRank}` : "-"}
                  </span>
                  <span className="leaderboard-progress-chip-name">{player.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="leaderboard-progress-chart-shell">
          <div className="leaderboard-progress-rank-axis" aria-hidden="true">
            {Array.from({ length: maxRank }, (_, index) => {
              const rank = index + 1;
              const y = padding.top + index * yStep;

              return (
                <span
                  className="leaderboard-progress-rank-axis-label"
                  key={rank}
                  style={{
                    top: chartScrollPadding + y,
                  }}
                >
                  {rank}
                </span>
              );
            })}
          </div>

          {selectedPlayer && selectedPlayerOverlayY !== null ? (
            <div
              className="leaderboard-progress-overlay-label"
              style={{
                borderColor: selectedPlayerColor,
                top: Math.max(10, selectedPlayerOverlayY - 30),
              }}
            >
              <span
                className="leaderboard-progress-overlay-dot"
                style={{ backgroundColor: selectedPlayerColor }}
              />
              <strong>{selectedPlayer.name}</strong>
            </div>
          ) : null}

          <div
            className="leaderboard-progress-chart-scroll"
            onScroll={(event) => {
              setScrollLeft(event.currentTarget.scrollLeft);
            }}
            ref={scrollRef}
          >
            <svg
              aria-label="Évolution du classement"
              className="leaderboard-progress-chart"
              height={chartHeight}
              role="img"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width={chartWidth}
            >
              {Array.from({ length: maxRank }, (_, index) => {
                const rank = index + 1;
                const y = padding.top + index * yStep;

                return (
                  <g key={rank}>
                    <line
                      className="leaderboard-progress-gridline"
                      x1={padding.left}
                      x2={chartWidth - padding.right}
                      y1={y}
                      y2={y}
                    />
                  </g>
                );
              })}

              {data.sections.map((section, index) => {
                const x = padding.left + index * xStep;
                const isFirstSection = index === 0;
                const isLastSection = index === data.sections.length - 1;
                const textAnchor = isFirstSection
                  ? "start"
                  : isLastSection
                    ? "end"
                    : "middle";
                const labelX = isFirstSection
                  ? x + 4
                  : isLastSection
                    ? x - 4
                    : x;

                return (
                  <g key={section.id}>
                    <line
                      className="leaderboard-progress-gridline is-vertical"
                      x1={x}
                      x2={x}
                      y1={padding.top}
                      y2={chartHeight - padding.bottom}
                    />
                    <text
                      className="leaderboard-progress-axis-label"
                      textAnchor={textAnchor}
                      x={labelX}
                      y={chartHeight - 12}
                    >
                      {data.kind === "WORLD_CUP" ? (
                        <>
                          <tspan x={labelX} dy={0}>
                            {splitWorldCupLabel(section.label).phase}
                          </tspan>
                          <tspan className="leaderboard-progress-axis-label-date" x={labelX} dy={12}>
                            {splitWorldCupLabel(section.label).date}
                          </tspan>
                        </>
                      ) : (
                        section.label
                      )}
                    </text>
                  </g>
                );
              })}

              {playersWithHistory.map((player, index) => {
                const points = player.history.map((point, pointIndex) => ({
                  x: padding.left + pointIndex * xStep,
                  y: padding.top + (point.rank - 1) * yStep,
                }));
                const isSelected = player.userId === selectedPlayer?.userId;
                const color = getPlayerColor(index);
                const lastPoint = points[points.length - 1];

                return (
                  <g key={player.userId}>
                    <path
                      className="leaderboard-progress-line-hitbox"
                      d={buildLinePath(points)}
                      onClick={() => setSelectedUserId(player.userId)}
                      stroke="transparent"
                      strokeWidth={16}
                    />
                    <path
                      className="leaderboard-progress-line"
                      d={buildLinePath(points)}
                      onClick={() => setSelectedUserId(player.userId)}
                      stroke={color}
                      strokeWidth={isSelected ? 4 : 1.6}
                      style={{ opacity: isSelected ? 1 : 0.22 }}
                    />
                    {lastPoint ? (
                      <>
                        <circle
                          className="leaderboard-progress-endpoint"
                          cx={lastPoint.x}
                          cy={lastPoint.y}
                          fill={color}
                          onClick={() => setSelectedUserId(player.userId)}
                          r={isSelected ? 5.5 : 3}
                          style={{ opacity: isSelected ? 1 : 0.34 }}
                        />
                      </>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
