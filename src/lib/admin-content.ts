/**
 * Allowlist for admin content writes.
 *
 * The /api/admin/content route performs writes with the SERVICE ROLE, which
 * bypasses RLS entirely. The only thing standing between a caller and arbitrary
 * database mutation is the admin check plus this allowlist — so it is
 * deliberately narrow: an explicit set of tables, an explicit set of writable
 * columns per table, and an explicit set of filterable columns per table.
 *
 * Adding a table or column here widens what an admin session can mutate.
 * Do not make it generic.
 */

export type AdminTable =
  | "punchlist_items"
  | "subjects"
  | "reader_pages"
  | "reader_books"
  | "flashcards"
  | "picture_quiz_questions"
  | "ebook_pages";

type TableRule = {
  /** Columns an admin may write. Nothing else is accepted. */
  columns: readonly string[];
  /** Columns an admin may filter on. Prevents unbounded updates. */
  filters: readonly string[];
};

export const ADMIN_CONTENT_RULES: Record<AdminTable, TableRule> = {
  punchlist_items: {
    columns: ["done", "updated_at"],
    filters: ["id"],
  },
  subjects: {
    columns: [
      "title_en",
      "title_th",
      "emoji",
      "is_published",
      "updated_at",
      "storybook_planned",
    ],
    filters: ["id"],
  },
  reader_pages: {
    columns: ["flagged"],
    filters: ["id"],
  },
  reader_books: {
    columns: ["status"],
    filters: ["id"],
  },
  flashcards: {
    columns: ["flagged", "flag_notes", "reviewed"],
    filters: ["id"],
  },
  picture_quiz_questions: {
    // subject_id filter backs the "mark all reviewed in this subject" button.
    columns: ["flagged", "flag_notes", "reviewed"],
    filters: ["id", "subject_id"],
  },
  ebook_pages: {
    columns: ["flagged", "flag_notes", "reviewed"],
    filters: ["id", "subject_id"],
  },
};

export type AdminUpdateRequest = {
  table: string;
  filterColumn: string;
  filterValue: string;
  patch: Record<string, unknown>;
};

/**
 * Validates a request against the allowlist. Returns an error string, or null
 * when the request is safe to execute.
 *
 * Rejects: unknown tables, unknown filter columns, empty/absent filter values,
 * empty patches, and any patch key not explicitly writable for that table.
 */
export function validateAdminUpdate(req: Partial<AdminUpdateRequest>): string | null {
  const { table, filterColumn, filterValue, patch } = req;

  if (typeof table !== "string" || !(table in ADMIN_CONTENT_RULES)) {
    return `table not allowed: ${String(table)}`;
  }
  const rule = ADMIN_CONTENT_RULES[table as AdminTable];

  if (typeof filterColumn !== "string" || !rule.filters.includes(filterColumn)) {
    return `filter column not allowed for ${table}: ${String(filterColumn)}`;
  }
  // An empty filter value would match nothing in Postgres, but an absent one
  // could become an unbounded update if the query builder is ever changed.
  if (typeof filterValue !== "string" || filterValue.trim() === "") {
    return "filter value is required";
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return "patch must be an object";
  }
  const keys = Object.keys(patch);
  if (keys.length === 0) return "patch is empty";

  for (const k of keys) {
    if (!rule.columns.includes(k)) {
      return `column not writable on ${table}: ${k}`;
    }
  }
  return null;
}
