import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default function AdminPage() {
  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Administration"
        title="Créer et piloter les compétitions."
        description="Prépare les tournois, importe les matchs, verrouille les pronos et valide les résultats."
      />

      <section className="page-section">
        <EmptyState
          title="Prochaine étape"
          text="Brancher l'auth, puis créer les écrans pour ajouter une compétition, ses équipes et ses matchs."
        />
      </section>
    </main>
  );
}
