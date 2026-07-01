import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PROJECT_SLUG } from "@/lib/supabase";

// Ten endpoint zamienia jednorazowy fetch z /api/news w trwały zapis.
// Wywoływany cyklicznie (Vercel Cron, patrz vercel.json) buduje historię,
// dzięki której "velocity" i trendy przestają być fikcją i stają się
// realną różnicą względem poprzedniego snapshotu w bazie.
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceOrAnonKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);
  const supabaseServer = createClient(url, serviceOrAnonKey);

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const period = req.nextUrl.searchParams.get("period") ?? "24h";

  const newsUrl = new URL("/api/news", req.nextUrl.origin);
  if (q) newsUrl.searchParams.set("q", q);
  newsUrl.searchParams.set("period", period);

  const res = await fetch(newsUrl.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "fetch /api/news failed" }, { status: 502 });
  }
  const data = await res.json();

  const { data: project, error: projectError } = await supabaseServer
    .from("projects")
    .select("id")
    .eq("slug", DEFAULT_PROJECT_SLUG)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "project not found", detail: projectError }, { status: 500 });
  }

  const { error: insertError } = await supabaseServer.from("snapshots").insert({
    project_id: project.id,
    query: q || null,
    period,
    total_documents: data.total ?? 0,
    sentiment_distribution: data.sentimentCounts ?? {},
    narratives: data.narratives ?? [],
    entities: data.entities ?? [],
    timeline: data.timeline ?? [],
  });

  if (insertError) {
    return NextResponse.json({ error: "insert failed", detail: insertError }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    savedAt: new Date().toISOString(),
    totalDocuments: data.total ?? 0,
    narrativeCount: (data.narratives ?? []).length,
  });
}
