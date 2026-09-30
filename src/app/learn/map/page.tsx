import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProgressIdServer } from "@/lib/progress-id.server";
import { loadBandCastles } from "@/lib/game/load";
import { CASTLES_PER_PAGE, MAP_BANDS, isMapBand } from "@/lib/game/rules";
import { CastleNode } from "@/components/game/CastleNode";
import { CastleSync } from "@/components/game/CastleSync";

export const dynamic = "force-dynamic";

const BAND_LABEL: Record<string, { en: string; th: string }> = {
  K: { en: "Kindergarten", th: "อนุบาล" },
  "1": { en: "Grade 1", th: "ป.1" },
  "2": { en: "Grade 2", th: "ป.2" },
  "3": { en: "Grade 3", th: "ป.3" },
};
const ALIGN = ["left", "center", "right", "center"] as const;

/**
 * Game map, Phase 2: one map per grade band, 5 castles a page, placeholder art.
 * Not linked from /learn yet (the Game/Tutor toggle is Phase 4); reach it at /learn/map.
 * Castle state is derived live from the real progress tables, so it works before the
 * game_progress migration is applied. game_progress only adds the persisted record.
 */
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; p?: string }>;
}) {
  const sp = await searchParams;
  const band = isMapBand(sp.band) ? sp.band : "K";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const progressId = await getProgressIdServer(supabase, user.id);
  const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const { castles } = await loadBandCastles(supabase, progressId, band, sub?.status === "active");

  // Which complete castles have no recorded row yet? (Error => table not applied => skip sync.)
  const { data: rows, error: gpErr } = await supabase
    .from("game_progress").select("subject_id, completed_at").eq("child_id", progressId);
  const recorded = new Set((rows ?? []).filter((r) => r.completed_at).map((r) => r.subject_id as string));
  const needSync = gpErr ? [] : castles.filter((c) => c.status === "complete" && !recorded.has(c.id)).map((c) => c.id);

  const pages = Math.max(1, Math.ceil(castles.length / CASTLES_PER_PAGE));
  const currentIdx = castles.findIndex((c) => c.status === "current");
  const defaultPage = currentIdx >= 0 ? Math.floor(currentIdx / CASTLES_PER_PAGE) + 1 : pages;
  const page = Math.min(pages, Math.max(1, Number.parseInt(sp.p ?? "", 10) || defaultPage));
  const start = (page - 1) * CASTLES_PER_PAGE;
  const visible = castles.slice(start, start + CASTLES_PER_PAGE);
  const done = castles.filter((c) => c.status === "complete").length;
  const q = (b: string, p: number) => `/learn/map?band=${b}&p=${p}`;

  return (
    <section>
      <CastleSync subjectIds={needSync} />
      <h1 className="font-nunito text-center text-3xl font-extrabold text-text-dark dark:text-gray-100">Castle Map</h1>
      <p className="font-sarabun mt-1 text-center text-lg text-text-mid dark:text-gray-400">แผนที่ปราสาท</p>
      <p className="mt-1 text-center text-xs text-text-light">Preview build: placeholder art.</p>

      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Grade band">
        {MAP_BANDS.map((b) => (
          <Link
            key={b} href={`/learn/map?band=${b}`} role="tab" aria-selected={b === band}
            className={`rounded-full px-4 py-1.5 font-nunito text-sm font-bold ${b === band ? "bg-sky-dark text-white" : "bg-white text-text-dark shadow dark:bg-gray-800 dark:text-gray-100"}`}
          >{BAND_LABEL[b].en} <span className="font-sarabun text-xs">{BAND_LABEL[b].th}</span></Link>
        ))}
      </div>

      <p className="mt-4 text-center font-nunito text-sm font-semibold text-text-mid dark:text-gray-400">
        {done} of {castles.length} castles flagged &middot; page {page} of {pages}
      </p>

      {castles.length === 0 ? (
        <p className="mt-8 text-center text-text-mid">No castles in this grade yet.</p>
      ) : (
        <ol className="relative mt-6 space-y-2">
          {visible.map((c, i) => (
            <li key={c.id}>
              <CastleNode castle={c} align={ALIGN[(start + i) % ALIGN.length]} number={start + i + 1} />
              {i < visible.length - 1 && (
                <div aria-hidden className="mx-auto my-1 h-8 w-0 border-l-4 border-dotted border-amber-400" />
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 flex items-center justify-between">
        {page > 1 ? (
          <Link href={q(band, page - 1)} className="rounded-full bg-sky-dark px-5 py-2 font-nunito font-bold text-white">← Back</Link>
        ) : <span />}
        {page < pages ? (
          <Link href={q(band, page + 1)} className="rounded-full bg-sky-dark px-5 py-2 font-nunito font-bold text-white">More castles →</Link>
        ) : <span />}
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/learn" className="text-sky-dark underline">Tutor view: all subjects</Link>
      </p>
    </section>
  );
}
