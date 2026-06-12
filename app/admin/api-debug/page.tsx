import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { getCurrentAdmin } from "@/src/auth/current-user";

export const dynamic = "force-dynamic";

type ApiDebugPageProps = {
  searchParams: Promise<{
    path?: string;
    params?: string;
  }>;
};

type ApiResult = {
  status: number;
  statusText: string;
  url: string;
  body: unknown;
};

const DEFAULT_PATH = "competitions/WC/matches";

const presets = [
  {
    label: "World Cup",
    path: "competitions/WC/matches",
    params: "season=2026",
  },
  {
    label: "Champions League",
    path: "competitions/CL/matches",
    params: "season=2025",
  },
  {
    label: "Premier League",
    path: "competitions/PL/matches",
    params: "season=2025",
  },
] as const;

function sanitizePath(value: string | undefined) {
  const path = value?.trim() || DEFAULT_PATH;

  if (!/^[a-zA-Z0-9/_-]+$/.test(path)) {
    return null;
  }

  return path.replace(/^\/+/, "");
}

function sanitizeParams(value: string | undefined) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  if (!/^[a-zA-Z0-9_=&%+.-]+$/.test(raw)) {
    return null;
  }

  return raw;
}

function buildDebugHref(path: string, params: string | null) {
  const searchParams = new URLSearchParams();

  searchParams.set("path", path);

  if (params) {
    searchParams.set("params", params);
  }

  return `/admin/api-debug?${searchParams.toString()}`;
}

async function fetchFootballData(path: string, params: string | null): Promise<ApiResult> {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    throw new Error("FOOTBALL_DATA_TOKEN manquant.");
  }

  const url = new URL(`https://api.football-data.org/v4/${path}`);

  if (params) {
    for (const entry of new URLSearchParams(params).entries()) {
      const [key, value] = entry;
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": token,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    body,
  };
}

export default async function AdminApiDebugPage({ searchParams }: ApiDebugPageProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const path = sanitizePath(resolvedSearchParams.path);
  const params = sanitizeParams(resolvedSearchParams.params);

  const result =
    path !== null
      ? await fetchFootballData(path, params)
      : null;

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Administration"
        title="Debug API"
        description="Interroge football-data.org et affiche la réponse brute."
      />

      <section className="page-section">
        <p className="readonly-notice">
          football-data attend un code de compétition comme <code>WC</code>, <code>PL</code> ou <code>CL</code>, pas un slug interne comme <code>WC2026</code>.
        </p>
      </section>

      <section className="page-section">
        <div className="admin-api-debug-presets">
          {presets.map((preset) => (
            <a
              className="admin-api-debug-preset"
              href={buildDebugHref(preset.path, preset.params)}
              key={preset.label}
            >
              <strong>{preset.label}</strong>
              <span>{preset.path}</span>
              <small>{preset.params}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="page-section">
        <form className="admin-api-debug-form" method="get">
          <label className="field">
            <span>Path API</span>
            <input name="path" defaultValue={resolvedSearchParams.path ?? DEFAULT_PATH} />
          </label>
          <label className="field">
            <span>Paramètres</span>
            <input
              name="params"
              placeholder="season=2026&status=LIVE"
              defaultValue={resolvedSearchParams.params ?? ""}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Interroger l&apos;API
          </button>
        </form>
      </section>

      <section className="page-section">
        {path === null ? (
          <p className="readonly-notice">
            Path invalide. Utilise uniquement des lettres, chiffres, slash, tiret ou underscore.
          </p>
        ) : result ? (
          <div className="admin-api-debug-result">
            <div className="admin-api-debug-meta">
              <strong>
                {result.status} {result.statusText}
              </strong>
              <span>{result.url}</span>
            </div>
            <pre>{JSON.stringify(result.body, null, 2)}</pre>
          </div>
        ) : (
          <p className="readonly-notice">
            Renseigne un path pour afficher la réponse.
          </p>
        )}
      </section>
    </main>
  );
}
