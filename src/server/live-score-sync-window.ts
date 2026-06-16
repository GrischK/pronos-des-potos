export function getLiveTrackingWindowStart(now: Date, trackingWindowHours: number) {
  return new Date(now.getTime() - trackingWindowHours * 60 * 60 * 1000);
}

export function isLiveScoreCandidateMatch(
  status: "LIVE" | "SCHEDULED",
  kickoffAt: Date,
  now: Date,
  trackingWindowHours = 4,
) {
  const trackingWindowStart = getLiveTrackingWindowStart(now, trackingWindowHours);

  // Keep retrying recently started matches even if the provider still reports
  // them as scheduled. Otherwise a single delayed status flip can make a match
  // disappear from the sync set permanently while later matches keep updating.
  return (
    kickoffAt <= now &&
    kickoffAt >= trackingWindowStart &&
    (status === "LIVE" || status === "SCHEDULED")
  );
}
