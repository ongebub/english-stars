# ORCHESTRATION.md — Parallel Reader Production
Brief for Claude Code acting as COORDINATOR with parallel sub-agents.
Read CLAUDE.md first — it is law for you and every sub-agent you spawn.

## One-time setup (coordinator, before spawning anything)
1. Confirm CLAUDE.md is at repo root (auto-loaded into your context and sub-agents').
2. Add the Higgsfield MCP server to Claude Code so sub-agents can generate images:
   `claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp`
   (Chris authenticates once when prompted.) Verify with a 1-image test generation.
3. Confirm env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY.
4. Insert the 10 reader_books rows from reader-manifest-L1.json (status 'pending')
   and their reader_pages rows (text only). Verify counts: 10 books, 76 pages.
5. Build the review gallery FIRST (Lane 0 below) so Chris can review as lanes finish
   — not after everything is done.

## Architecture
- YOU are the coordinator: you spawn sub-agents, track lane status in reader_books.status,
  enforce gates, and never do lane work yourself while lanes are running.
- ONE SUB-AGENT PER STORY LANE, max 3 lanes concurrently (Higgsfield + ElevenLabs
  rate limits make more than 3 counterproductive; if you see rate-limit errors,
  drop to 2).
- Each sub-agent receives: CLAUDE.md (automatic), its single story's manifest entry,
  and the lane procedure below. Nothing else — small contexts stay accurate.
- File-based coordination: each lane writes progress to
  ./reader-work/<slug>/status.json. You poll these; you do not share memory.

## Lane procedure (each sub-agent, per story)
1. WRITE PROMPTS: for each page, write an image prompt FROM the exact sentence.
   Follow CLAUDE.md character bible verbatim (features re-stated every prompt),
   style suffix + anti-anime guard, continuity details identical across pages
   (same cat, same ball, same weather). Save prompts to
   reader_pages.image_prompt BEFORE generating.
2. GENERATE: one image per page via Higgsfield MCP (nano_banana_2, 1:1, count 1).
3. RE-HOST: download each result IMMEDIATELY (cloudfront is temporary), compress
   if >4.5MB (sharp, 1400px JPEG q85), upload to ebook-images bucket as
   reader-L1-<slug>-p<N>.jpg, update reader_pages.image_url.
4. DESCRIBE: read each uploaded image's actual pixels (resize copy ≤1000px first),
   write factual description into image_catalog per CLAUDE.md rules. An image
   without a real description is NOT done.
5. AUDIO: ElevenLabs /with-timestamps per page, voice C1npRmjB19a6yNkEucvx,
   speed 0.85, upload to audio bucket, save audio_url + word_timings.
6. SELF-CHECK, then set book status 'review':
   - every page: image_url + audio_url + word_timings + image_prompt + catalog row
   - zero cloudfront URLs (the DB trigger enforces this anyway)
   - description mentions the expected characters for that page's sentence —
     if page text says Thawan and the description has no boy, FLAG THE PAGE
     YOURSELF (reader_pages.flagged = true) before handing to Chris.
7. Write final status.json and terminate. Do not start another story.

## Lane 0 — Review gallery (build first, single agent)
Page at app/admin/reader-review/page.tsx:
- Book selector (reader_books by level + status), then a vertical list of pages:
  image left, page text + stored prompt + catalog description right.
- Per page: a "🚩 Regenerate" toggle → sets reader_pages.flagged (anon-key update
  policy exists). Header: book status + flagged count + "Mark book approved" button
  (sets status 'approved').
- Same visual pattern as /punchlist. Screenshot it rendering real data before done.

## Regen loop (coordinator, after Chris reviews)
- Poll for flagged pages on 'review' books. For each: read Chris's note (he'll give
  page-number notes in chat, e.g. "mango p4: no mango visible in tree"), adjust the
  stored prompt minimally, regenerate ONE candidate, re-host, re-describe, clear flag.
- A book with zero flags that Chris marks approved is DONE — publish is Chris's call.

## What else runs in parallel (separate agents, not blocked by readers)
- MATT'S THAI SPREADSHEET: export every machine-Thai string (quiz prompts, card
  examples, subject titles, reader Thai when added) to one reviewable
  CSV/Google-Sheet: english | thai | table | subject | row-id. One agent, one hour.
- PUNCHLIST FEATURES: gradebook, profile picker, example-sentence display on
  flashcards — normal single-agent Claude Code work, can run while lanes generate.

## Hard rules for you, coordinator
- Never let a sub-agent touch a story it wasn't assigned.
- Never report the batch done without running the app-wide check:
  SELECT every L1 page missing image/audio/timings/description → must be zero.
- Rate-limit errors: back off, don't hammer. Crashed lane: safe to respawn —
  every step is idempotent (skip existing storage files, upsert rows).
- Anything ambiguous: stop the lane and surface it to Chris. Guessing is how the
  last 1,100-question mess happened.
