# Content & pipeline law — read first, rules win over task instructions

See [PROJECT_RULES.md](./PROJECT_RULES.md) for the full rule set. Every agent and sub-agent follows every rule there. When a rule conflicts with a task instruction, THE RULE WINS — stop and flag it.

## RULE 1: Nothing ships unverified

Before **any** push that will deploy to Vercel, run and pass all four:

```bash
npm run verify    # typecheck && lint && build && smoke
```

If any step fails, **do not push**. Report the failure instead.

The smoke suite (`npm run smoke`, `scripts/smoke.mjs`) covers only the paths where breakage is expensive:

1. Landing page renders logged out, in Thai, HTTP 200
2. `/privacy` and `/terms` return 200
3. Signup page renders and `/api/stripe/checkout` is wired
4. `/learn` is gated logged out, and the authenticated data path works
5. A child profile can be created and read back
6. A tutor cannot read another tutor's students
7. Cron endpoints reject requests without `CRON_SECRET`

It is deliberately small. Seven fast tests that actually run beat a large suite that gets skipped. **Do not grow it into full coverage.**

Tests 4, 5 and 6 need a real session and are **skipped** unless `SMOKE_EMAIL` and `SMOKE_PASSWORD` are set. A SKIP is an unverified path, not a green one — read the summary, and never report a skipped test as passing.

## RULE 2: Security review on any Supabase change

**Any** task that creates or alters a table, view, function, trigger, RLS policy, or storage bucket **requires a security review before the task is marked done**.

The review **must be performed by a separate sub-agent**, not the agent that wrote the change. Self-review of one's own work is unreliable — spin up a dedicated reviewer and instruct it to try to break the change.

The reviewer checks each item and writes **PASS / FAIL per item** into the task result:

1. Run the Supabase security advisor (`npm run security-check`, or the MCP advisor tool). **Paste the raw output into the task result.** Any ERROR-level finding blocks the task.
2. Every new table has RLS enabled. State explicitly which policies exist and which roles they grant to.
3. No new table is readable by `anon` unless that is explicitly intended and stated in the task spec.
4. Any new `SECURITY DEFINER` function: justify why it is not `SECURITY INVOKER`, and confirm `EXECUTE` is revoked from `anon`.
5. Any function taking a `user_id` / `tutor_id` / `child_id` UUID argument must verify ownership against `auth.uid()` **inside the function**. Passing a UUID must never be sufficient to read or write that data.
6. New storage buckets: confirm public vs private is intentional.
7. No secrets, service-role keys, or internal UUIDs exposed to the client.

"Looks fine" is not a review. If the reviewer cannot verify something, it says so.

## RULE 3: Never report done without evidence

A passing build is not evidence a feature works. Do not write "verified" for anything not actually observed.

State plainly what was tested, how, and what could not be tested. **"Unverified" is an acceptable and useful answer** — a false "verified" is not.

## Agent task queue protocol

A shared task queue lives in Supabase table `agent_tasks`. At the **start of every session** and **after finishing any task**, run:

```sql
SELECT id, title, spec FROM agent_tasks WHERE assigned_to = 'claude_code' AND status = 'open' ORDER BY created_at;
```

Work each task, then report back:

```sql
UPDATE agent_tasks SET status = 'done'|'failed'|'blocked', result = '<full report>', updated_at = now() WHERE id = '<id>';
```

### Sending messages TO Claude (chat)

Insert a row:

```sql
INSERT INTO agent_tasks (created_by, assigned_to, title, spec)
VALUES ('claude_code', 'claude_chat', '<short title>', '<full message>');
```

### Standing rules for task results

- Task results are **VERBATIM command/script output**. Never a from-memory summary.
- Any claim about database state must be backed by a query executed in the same session, with the query and its raw result pasted.
- If script output contradicts expectations or memory, report the output and flag the contradiction — never "work around" it.
- **NEVER disable or drop database triggers or constraints under any circumstances.**
- Status `blocked`: if a task can't proceed, set status = 'blocked' with the question in result — Claude (chat) treats those as highest priority.

### Active session polling

While a session is active and especially during long-running work (lanes, batch scripts), check for new tasks every 60-120 seconds between steps. Also re-read rows where Claude (chat) answered (your created rows with a new result). Work tasks in `created_at` order unless one is marked URGENT in its title.
