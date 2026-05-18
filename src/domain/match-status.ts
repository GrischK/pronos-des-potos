const matchStatusLabels: Record<string, string> = {
  AWARDED: "Attribué",
  CANCELLED: "Annulé",
  FINISHED: "Terminé",
  LIVE: "En cours",
  POSTPONED: "Reporté",
  PAUSED: "Pause",
  SCHEDULED: "À venir",
  SUSPENDED: "Interrompu",
};

export function getMatchStatusLabel(status: string) {
  return matchStatusLabels[status] ?? status;
}

export function getLiveMatchStatusLabel(liveMinute: number | null) {
  return liveMinute === 45 ? "Mi-temps" : liveMinute !== null ? `${liveMinute}'` : "En cours";
}
