/**
 * Fix Common Verbs flashcard audio.
 * New audio: "{Word}. {Word}." spoken twice, no example sentence.
 * Overwrites existing audio files in Supabase storage.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "C1npRmjB19a6yNkEucvx";
const MODEL_ID = "eleven_multilingual_v2";
const SPEED = 0.85;
const DELAY_MS = 2000;

async function generateAudio(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // 1. Fetch all 20 Common Verbs flashcards
  const { data: cards, error } = await supabase
    .from("flashcards")
    .select("id, word_en, audio_url, subjects!inner(title_en)")
    .eq("subjects.title_en", "Common Verbs")
    .order("sort_order");

  if (error) throw error;
  console.log(`Found ${cards.length} Common Verbs cards\n`);

  let successCount = 0;

  for (const card of cards) {
    const word = card.word_en;
    const audioText = `${word}. ${word}.`;
    // Extract filename from existing URL, e.g. "verb-run.mp3"
    const urlParts = card.audio_url.split("/");
    const filename = urlParts[urlParts.length - 1];

    console.log(`[${word}] Generating: "${audioText}" -> ${filename}`);

    try {
      // Generate audio
      const mp3 = await generateAudio(audioText);
      console.log(`  Audio: ${mp3.length} bytes`);

      // Upload to Supabase storage (overwrite)
      const { error: uploadErr } = await supabase.storage
        .from("audio")
        .upload(filename, mp3, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      // Set example_en = NULL
      const { error: updateErr } = await supabase
        .from("flashcards")
        .update({ example_en: null })
        .eq("id", card.id);
      if (updateErr) throw updateErr;

      successCount++;
      console.log(`  OK\n`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`);
    }

    // Rate-limit delay
    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${successCount}/${cards.length} cards updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
