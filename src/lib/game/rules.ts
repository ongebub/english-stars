/**
 * Game mode rules. Pure functions, no I/O, so the same rule decides both what
 * the map shows and what the server records.
 *
 * Decisions (Chris, 2026-09-30): pass = 7 of 10 on the fill-in-the-blank quiz;
 * the picture quiz does not count; retries are unlimited and the best attempt
 * counts; Interview Practice (band 'all') is not on the map.
 */

export const PASS_NUMERATOR = 7;
export const PASS_DENOMINATOR = 10;
export const CASTLES_PER_PAGE = 5;
export const MAP_BANDS = ["K", "1", "2", "3"] as const;
export type MapBand = (typeof MAP_BANDS)[number];
/** Same free subject the /learn grid uses. */
export const FREE_SLUG = "abcs";

export type FlagLevel = "bronze" | "silver" | "gold";
export type CastleStatus = "complete" | "current" | "locked";

export function isMapBand(v: string | undefined | null): v is MapBand {
  return !!v && (MAP_BANDS as readonly string[]).includes(v);
}

/** Pass test, scaled so a quiz total other than 10 still means 70%. */
export function quizPassed(score: number | null, total: number | null): boolean {
  if (score === null || !total || total <= 0) return false;
  return score * PASS_DENOMINATOR >= PASS_NUMERATOR * total;
}

/** Flag colour from the best quiz: 10 gold, 9-8 silver, pass-7 bronze. Null if not passed. */
export function flagLevel(score: number | null, total: number | null): FlagLevel | null {
  if (!quizPassed(score, total) || score === null || !total) return null;
  const tenths = (score * 10) / total;
  if (tenths >= 10) return "gold";
  if (tenths >= 8) return "silver";
  return "bronze";
}

export interface CastleInput {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  emoji: string;
  hasFlashcards: boolean;
  hasStorybook: boolean;
  hasQuiz: boolean;
  flashcardsDone: boolean;
  storybookDone: boolean;
  bestScore: number | null;
  bestTotal: number | null;
}

export interface Castle extends CastleInput {
  status: CastleStatus;
  flag: FlagLevel | null;
  /** Required steps that exist for this subject, in play order. */
  steps: { key: "flashcards" | "storybook" | "quiz"; done: boolean }[];
  /** Not subscribed and not the free subject. */
  paywalled: boolean;
}

/** A castle is complete when every step it has is done and the quiz is passed. */
export function castleComplete(c: CastleInput): boolean {
  const needsAnything = c.hasFlashcards || c.hasStorybook || c.hasQuiz;
  if (!needsAnything) return false;
  if (c.hasFlashcards && !c.flashcardsDone) return false;
  if (c.hasStorybook && !c.storybookDone) return false;
  if (c.hasQuiz && !quizPassed(c.bestScore, c.bestTotal)) return false;
  return true;
}

/**
 * Turn an already-ordered list of castles into map states.
 * First castle is open. Castle N+1 is open once N is complete. The first
 * incomplete castle is "current"; every later one is locked. Completed castles
 * stay complete (and replayable) regardless of what comes before them.
 */
export function buildCastles(ordered: CastleInput[], isSubscribed: boolean): Castle[] {
  let frontierTaken = false;
  return ordered.map((c) => {
    const complete = castleComplete(c);
    let status: CastleStatus;
    if (complete) status = "complete";
    else if (!frontierTaken) { status = "current"; frontierTaken = true; }
    else status = "locked";
    const steps: Castle["steps"] = [];
    if (c.hasFlashcards) steps.push({ key: "flashcards", done: c.flashcardsDone });
    if (c.hasStorybook) steps.push({ key: "storybook", done: c.storybookDone });
    if (c.hasQuiz) steps.push({ key: "quiz", done: quizPassed(c.bestScore, c.bestTotal) });
    return {
      ...c,
      status,
      flag: complete ? flagLevel(c.bestScore, c.bestTotal) : null,
      steps,
      paywalled: !isSubscribed && c.slug !== FREE_SLUG && status !== "complete",
    };
  });
}
