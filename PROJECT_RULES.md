# CLAUDE.md — English Allstars Project Rules
**This file is law. Every agent and sub-agent working on this project follows every rule here.
When a rule conflicts with a task instruction, THE RULE WINS — stop and flag it.**
Last updated: 16 Jul 2026 by Chris + Claude.

## What this project is
Subscription ESL test-prep app for Thai children (K–3) at englishallstars.com.
Stack: Next.js 14 / TypeScript / Tailwind / Supabase / Vercel.
Supabase project: `htvwuajsnsivivfxtxvf`. Repo: github.com/ongebub/english-stars.
Chris (owner, reviews everything) + Matt (English professor, reviews all Thai text).

---

## CONTENT RULES (violations here caused a 1,100-question rewrite — never again)

1. **Quizzes are fill_blank ONLY.** Context-based, never spelling. No word_to_letter,
   no word_to_picture in `quiz_questions`.
   **EXEMPT:** ABCs, Phonics Sounds, Phonics Blending, Rhyming Words — letters and
   sounds ARE their subject, spelling questions allowed there.
2. **Word-to-picture belongs only in picture quizzes** (`picture_quiz_questions`).
3. **Picture-quiz rule:** if the tested word is NOT stated in the question text,
   it must be VISIBLY DEPICTED in the correct image. No inference chains.
4. **Flashcards:** simple/concrete words = word text + bare word audio only.
   Complex/abstract words (grammar subjects) = word text + audio speaking a context
   sentence ("Us. Ollie gave the cookies to us."), at 0.85× speed.
5. **No question may have a defensible second answer.** Distractors are curated:
   doctor questions never offer nurse, happy never offers excited, in/inside and
   under/below and next to/near never co-occur as options, "kick with your ___"
   never offers feet next to legs. When writing questions, actively hunt for the
   plausible wrong answer and exclude it from the options.
6. **Never write image-dependent content blind.** Any sentence, question, or caption
   that references an image must be written against that image's `image_catalog`
   description — or written FIRST, with the image then generated to match.

## CHARACTER BIBLE (state features explicitly in EVERY image prompt — never rely on the Element alone)

| Character | Element ID | Must state every time |
|---|---|---|
| Ollie | `b9926e8d-23ab-4d21-b0e8-895affff1467` | brown owl, round glasses, blue graduation cap |
| Nong Fah | `8edea4b8-45e7-4238-b2f9-763134c602b7` | 8-year-old Thai girl, **red bow in her hair** (drops ~1-in-6 if unstated) |
| Thawan | `95530f76-6c73-47bf-9307-4b9fad7c0879` | 8-year-old Thai boy, **cowlick tuft of hair at his crown** |

New recurring friends (no Elements — describe fully and IDENTICALLY every appearance):
- **Frog**: small round bright-green frog, big friendly eyes, yellow tummy
- **Cat**: small orange tabby cat, white paws, pink nose
- **Duck**: small yellow duckling, orange beak and feet
These three characters are the core of everything. New animal friends are allowed,
but the three humans/owl must remain central.

## IMAGE GENERATION

- Model: `nano_banana_2`, aspect_ratio `1:1`.
- **Element IDs are MANDATORY.** Embed `<<<element_id>>>` in the prompt text
  immediately before each character's name, every single time they appear:

  | Character | Element UUID |
  |-----------|-------------|
  | Ollie     | `b9926e8d-23ab-4d21-b0e8-895affff1467` |
  | Nong Fah  | `8edea4b8-45e7-4238-b2f9-763134c602b7` |
  | Thawan    | `95530f76-6c73-47bf-9307-4b9fad7c0879` |

  Do NOT pass Element IDs via the `medias` parameter — nano_banana_2 rejects
  `reference_element` role. The `<<<UUID>>>` prompt syntax is the only correct method.

- **Feature restatement in words anyway** — the Element alone drops the red bow
  ~1-in-6, so always state: "red bow in her hair," "cowlick tuft at his crown,"
  "round glasses and blue graduation cap," verbatim, every appearance.
- **Outfit continuity** — pick each character's outfit once per story and repeat
  identically on every page (e.g. "teal t-shirt and dark blue shorts").
- Style suffix on EVERY prompt (copy-paste, never reword): *"Soft cel-shaded
  children's storybook illustration style, clean rounded linework, bright cheerful
  colors, warm and wholesome mood, square composition. No text, no letters, no words."*
- Anti-anime guard on EVERY prompt (copy-paste, never reword): *"Western storybook
  cartoon style, NOT anime; normal friendly cartoon eyes, not large glossy anime eyes."*
- **Continuity clause** — props and setting carried from prior pages named explicitly
  ("the same red ball," "the same mango tree").
- **Scene-only pages** — any page whose text contains no characters must include
  verbatim: *"No people, no children, no animals, no characters."* (adjust "no
  animals" if an animal IS the subject). Scene-only pages without this clause get
  invented characters.
- Readers: **ONE image per page** (Chris's rule — accuracy of the prompt is
  everything; flagged pages get regenerated, not multi-candidate picked).
- Every prompt is written FROM the page's exact approved sentence. The scene must
  literally depict the sentence.
- Store the exact prompt in `reader_pages.image_prompt` — regens must be reproducible.
- Known failure modes to avoid: anime-eye drift, missing red bow, missing cowlick,
  curved-glass/aquarium perspective scenes, accidental rendered text.

### Gold-standard prompt example (The Big Mango p7, "Ollie flies up.")

```
<<<b9926e8d-23ab-4d21-b0e8-895affff1467>>> Ollie, a brown owl with round glasses
and a blue graduation cap, flies upward toward a large ripe yellow mango hanging
in a leafy green mango tree, his wings spread mid-flight. Below him on the grass,
<<<95530f76-6c73-47bf-9307-4b9fad7c0879>>> Thawan, an 8-year-old Thai boy with a
small cowlick tuft of hair sticking up at his crown, wearing a teal t-shirt and
dark blue shorts, looks up at Ollie with an excited hopeful expression, hands
raised. Sunny daytime, garden setting, the same mango tree and single large mango
from the previous pages. Soft cel-shaded children's storybook illustration style,
clean rounded linework, bright cheerful colors, warm and wholesome mood, square
composition. No text, no letters, no words. Western storybook cartoon style, NOT
anime; normal friendly cartoon eyes, not large glossy anime eyes.
```

## IMAGE CATALOG (mandatory — this is what ended the blind-writing era)

- Table `image_catalog`: every image in the app has a row with a factual description.
- **Every new image is described AT BIRTH**: after generating and re-hosting, read the
  actual image file (resize to ≤1000px JPEG first if oversized) and write 1–3 factual
  sentences: objects WITH COUNTS, actions, layout, colors, characters present,
  contains_text flag, quality_flag if off-model.
- Describe ONLY what is visible. Never infer from the filename. Never mark an image
  described without having actually read its pixels.

## STORAGE & PIPELINE CONVENTIONS

- **Higgsfield CDN URLs (`cloudfront`) are TEMPORARY.** Re-host to Supabase storage
  immediately. A DB trigger BLOCKS any insert/update containing 'cloudfront' on all
  content tables — this is intentional; if you hit it, re-host first.
- Supabase storage: images ≤5MB (compress with sharp: 1400px JPEG q85 if over).
- Buckets: `flashcard-images`, `ebook-images`, `audio`. Reader assets:
  `ebook-images/reader-L<level>-<book_slug>-p<page>.jpg`,
  `audio/reader-L<level>-<book_slug>-p<page>.mp3`.
- ElevenLabs voice: `C1npRmjB19a6yNkEucvx` (current standard for ALL new audio).
  Reader narration: `/with-timestamps` endpoint for word_timings, slow (0.85 speed),
  model `eleven_multilingual_v2`.
- Env (in .env.local): `NEXT_PUBLIC_SUPABASE_URL` (never SUPABASE_URL),
  `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`.
- Scripts live in `ebook scripts/`, run as:
  `node --env-file=.env.local "ebook scripts/<name>.mjs"`.
- All scripts are IDEMPOTENT: skip existing storage files, delete-then-insert or
  upsert DB rows, safe to re-run after any crash.

## READER BOOKS (current production push)

- Tables: `reader_books` (title, reading_level 1–3, status, sort_order) and
  `reader_pages` (book_id, page_number, text_en, image_url, audio_url,
  word_timings, image_prompt, flagged). SEPARATE from ebook_pages — never mix.
- Levels: 1 = new/emergent (K), 2 = beginner (G1), 3 = developing (G2–3).
- Grade-segment buttons: K→L1, Grade 1→L2, Grades 2+3→L3.
- Page text is APPROVED BY CHRIS before any image is generated. Never alter
  approved text; if a sentence won't illustrate well, flag it, don't rewrite it.
- Book status flow: pending → images → audio → review → approved (Chris sets approved).

## UI RULES

- Any UI change is verified against a SCREENSHOT of the rendered page before being
  reported done. "The code looks right" is not done.
- Quiz page layout: content starts below the fixed header (pt equal to measured
  header height), question block vertically centered in remaining viewport,
  everything inside max-w-3xl. No text below ~14px for child-facing content.
- Thai UI text and all Thai content is machine-generated until Matt reviews it.
  Mark new Thai for his pile; never claim it's verified.

## REVIEW WORKFLOW

- Chris reviews in batches via HTML galleries (image + page text + prompt side by
  side, flag button per page). Build galleries at /admin/reader-review reading
  reader_pages; the flag button sets reader_pages.flagged = true.
- Flagged pages: regenerate from the stored image_prompt (adjusted per Chris's
  note), replace image, re-describe in catalog, clear flag.
- NEVER report a task complete without its verification step: storage health check,
  DB count check, catalog check (no NULL descriptions for new images), and for UI —
  the screenshot.
