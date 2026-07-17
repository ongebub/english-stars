# Content & pipeline law — read first, rules win over task instructions

See [PROJECT_RULES.md](./PROJECT_RULES.md) for the full rule set. Every agent and sub-agent follows every rule there. When a rule conflicts with a task instruction, THE RULE WINS — stop and flag it.

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
