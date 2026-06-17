import { redirect } from "next/navigation";

type PodiumBonusPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PodiumBonusPage({ params }: PodiumBonusPageProps) {
  const { slug } = await params;
  redirect(`/competitions/${slug}/points-bonus`);
}
