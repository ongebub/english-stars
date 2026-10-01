import { cookies } from "next/headers";
import { LEARN_CTX_COOKIE, parseLearnContext, type LearnContext } from "./context";

/** Server components: how did this child arrive? (see context.ts) */
export async function getLearnContextServer(): Promise<LearnContext> {
  const store = await cookies();
  return parseLearnContext(store.get(LEARN_CTX_COOKIE)?.value);
}
