import { NextResponse } from "next/server";

import { savePrediction } from "@/src/server/prediction-save";

export const dynamic = "force-dynamic";

type PredictionRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: PredictionRouteContext) {
  const { slug } = await params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Prono invalide." }, { status: 400 });
  }

  const result = await savePrediction({
    ...(typeof payload === "object" && payload !== null ? payload : {}),
    slug,
  });

  if (result.error) {
    const status = result.error.startsWith("Connecte-toi") ? 401 : 400;

    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
