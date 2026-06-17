import { redirect } from "next/navigation";

type ClassementEvolutionPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function ClassementEvolutionPage({
  params,
  searchParams,
}: ClassementEvolutionPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const mode = resolvedSearchParams?.mode ? `?mode=${resolvedSearchParams.mode}` : "";

  redirect(`/competitions/${slug}/graph${mode}`);
}
