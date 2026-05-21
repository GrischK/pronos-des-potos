import "server-only";

const CRON_JOB_ORG_ENDPOINT = "https://api.cron-job.org";

type CronJobSchedule = {
  timezone: string;
  expiresAt: number;
  hours: number[];
  mdays: number[];
  minutes: number[];
  months: number[];
  wdays: number[];
};

type CronJobPatch = {
  enabled?: boolean;
  schedule?: CronJobSchedule;
};

function getCronJobOrgConfig() {
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;
  const liveScoresJobId = process.env.CRON_JOB_ORG_LIVE_SCORES_JOB_ID;

  if (!apiKey || !liveScoresJobId) {
    return null;
  }

  return {
    apiKey,
    liveScoresJobId,
  };
}

async function patchCronJob(jobId: string, job: CronJobPatch) {
  const config = getCronJobOrgConfig();

  if (!config) {
    return {
      skipped: true,
      reason: "CRON_JOB_ORG_API_KEY ou CRON_JOB_ORG_LIVE_SCORES_JOB_ID manquant.",
    };
  }

  const response = await fetch(`${CRON_JOB_ORG_ENDPOINT}/jobs/${jobId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `cron-job.org a repondu ${response.status}: ${body || response.statusText}`,
    );
  }

  return {
    skipped: false,
  };
}

export function setLiveScoresCronEnabled(enabled: boolean) {
  const config = getCronJobOrgConfig();

  if (!config) {
    return Promise.resolve({
      skipped: true,
      reason: "CRON_JOB_ORG_API_KEY ou CRON_JOB_ORG_LIVE_SCORES_JOB_ID manquant.",
    });
  }

  return patchCronJob(config.liveScoresJobId, { enabled });
}

export function scheduleLiveScoresCron(hours: number[], timezone: string) {
  const config = getCronJobOrgConfig();

  if (!config) {
    return Promise.resolve({
      skipped: true,
      reason: "CRON_JOB_ORG_API_KEY ou CRON_JOB_ORG_LIVE_SCORES_JOB_ID manquant.",
    });
  }

  return patchCronJob(config.liveScoresJobId, {
    enabled: hours.length > 0,
    schedule: {
      timezone,
      expiresAt: 0,
      hours,
      mdays: [-1],
      minutes: [-1],
      months: [-1],
      wdays: [-1],
    },
  });
}
