import Link from "next/link";

import { CompetitionForm } from "@/components/admin/CompetitionForm";
import { PageHeader } from "@/components/PageHeader";
import {
  deleteCompetitionAction,
  renameCompetitionAction,
  syncCompetitionAction,
  toggleCompetitionOpenAction,
  updateCompetitionKindAction,
} from "@/src/server/admin-actions";
import { getAdminCompetitions } from "@/src/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const competitions = await getAdminCompetitions();

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Administration"
        title="Créer une compétition."
        description="Renseigne le code compétition football-data.org et la saison, puis importe les équipes et les matchs."
      />

      <section className="page-section">
        <div className="admin-layout">
          <section className="card admin-panel">
            <p className="badge badge-live">football-data.org</p>
            <h2>Nouvelle compétition</h2>
            <p>
              football-data.org est la source principale pour le calendrier,
              les équipes, les scores et les livescores pendant la compétition.
            </p>

            <CompetitionForm />
          </section>

          <section className="card admin-panel">
            <p className="badge badge-warning">Compétitions</p>
            <h2>Déjà configurées</h2>

            {competitions.length === 0 ? (
              <p>Aucune compétition créée pour le moment.</p>
            ) : (
              <div className="admin-list">
                {competitions.map((competition) => (
                  <div className="admin-list-item" key={competition.id}>
                    <Link href={`/competitions/${competition.slug}`}>
                      <strong>{competition.name}</strong>
                    </Link>
                    <span>
                      {competition.kind} · {competition.status} ·{" "}
                      {competition._count.teams} équipes ·{" "}
                      {competition._count.matches} matchs
                    </span>
                    {competition.externalProvider &&
                    competition.externalCompetitionId &&
                    competition.externalSeason ? (
                      <span>
                        {competition.externalProvider} #
                        {competition.externalCompetitionId}, saison{" "}
                        {competition.externalSeason}
                      </span>
                    ) : null}
                    <form
                      action={renameCompetitionAction}
                      className="admin-rename-form"
                    >
                      <input
                        name="competitionId"
                        type="hidden"
                        value={competition.id}
                      />
                      <label className="field">
                        <span>Renommer le tournoi</span>
                        <input
                          defaultValue={competition.name}
                          minLength={3}
                          name="name"
                          required
                        />
                      </label>
                      <button className="btn btn-secondary" type="submit">
                        Renommer
                      </button>
                    </form>
                    <form
                      action={updateCompetitionKindAction}
                      className="admin-rename-form"
                    >
                      <input
                        name="competitionId"
                        type="hidden"
                        value={competition.id}
                      />
                      <label className="field">
                        <span>Type de compétition</span>
                        <select name="kind" required defaultValue={competition.kind}>
                          <option value="WORLD_CUP">Coupe du monde</option>
                          <option value="EURO">Euro</option>
                          <option value="CHAMPIONS_LEAGUE">Champions League</option>
                          <option value="OTHER">Autre</option>
                        </select>
                      </label>
                      <button className="btn btn-secondary" type="submit">
                        Modifier
                      </button>
                    </form>
                    <div className="admin-item-actions">
                      <form action={toggleCompetitionOpenAction}>
                        <input
                          name="competitionId"
                          type="hidden"
                          value={competition.id}
                        />
                        <button
                          className={
                            competition.status === "OPEN"
                              ? "btn btn-warning"
                              : "btn btn-primary"
                          }
                          type="submit"
                        >
                          {competition.status === "OPEN"
                            ? "Fermer les pronos"
                            : "Ouvrir les pronos"}
                        </button>
                      </form>

                      <form action={syncCompetitionAction}>
                        <input
                          name="competitionId"
                          type="hidden"
                          value={competition.id}
                        />
                        <button className="btn btn-secondary" type="submit">
                          Synchroniser
                        </button>
                      </form>

                      <form action={deleteCompetitionAction}>
                        <input
                          name="competitionId"
                          type="hidden"
                          value={competition.id}
                        />
                        <button className="btn btn-danger" type="submit">
                          Effacer
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
