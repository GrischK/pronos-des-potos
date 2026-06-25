import { NextResponse } from "next/server";

import { getPredictionMatchesData } from "@/src/server/predictions";

export const dynamic = "force-dynamic";

type PredictionMatchesRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: PredictionMatchesRouteContext,
) {
  const { slug } = await params;
  const matches = await getPredictionMatchesData(slug);

  if (!matches) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ matches });
}
