export function getPlayerPointsLabel(points: number | null) {
  if (points === null) {
    return "À venir";
  }

  return `${points} pt${points > 1 ? "s" : ""}`;
}

function getPointsToneClass(points: number | null) {
  if (points === null || points === 0) {
    return "player-points-neutral";
  }

  if (points === 1) {
    return "player-points-outcome";
  }

  if (points === 3) {
    return "player-points-exact";
  }

  if (points === 4) {
    return "player-points-unique";
  }

  return "player-points-neutral";
}

type PlayerPointsBadgeProps = {
  points: number | null;
  label?: string;
  className?: string;
};

export function PlayerPointsBadge({
  points,
  label = "Points",
  className = "",
}: PlayerPointsBadgeProps) {
  return (
    <strong className={`player-points-cell ${getPointsToneClass(points)} ${className}`.trim()}>
      <span className="player-score-label">{label}</span>
      <span className="player-points-badge">{getPlayerPointsLabel(points)}</span>
    </strong>
  );
}
