import { NextResponse } from "next/server";

import { getAllPredictionsMatchesData } from "@/src/server/all-predictions";

export const dynamic = "force-dynamic";

type AllPredictionsMatchesRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: AllPredictionsMatchesRouteContext,
) {
  const { slug } = await params;
  const matches = await getAllPredictionsMatchesData(slug);

  if (!matches) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ matches });
}
