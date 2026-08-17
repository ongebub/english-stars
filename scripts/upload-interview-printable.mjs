#!/usr/bin/env node
/**
 * upload-interview-printable.mjs
 *
 * Publishes the generated worksheet to the public `printables` bucket, which is
 * where /api/interview/printable fetches it from at send time.
 *
 *   node scripts/build-interview-printable.mjs   # regenerate
 *   node scripts/upload-interview-printable.mjs  # publish
 *
 * The PDF is served from storage rather than bundled into the deployment so the
 * content can be corrected and re-uploaded without a redeploy.
 *
 * Uses the service role: the bucket is public to READ, but writes are not open.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

loadEnv({ path: ".env.local" });
loadEnv();

const LOCAL = "assets/printables/interview-20-questions.pdf";
const BUCKET = "printables";
const OBJECT = "interview-20-questions.pdf";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
if (!existsSync(LOCAL)) {
  console.error(`${LOCAL} not found. Run: node scripts/build-interview-printable.mjs`);
  process.exit(1);
}

const pdf = readFileSync(LOCAL);
const supabase = createClient(url, key);

const { error } = await supabase.storage.from(BUCKET).upload(OBJECT, pdf, {
  contentType: "application/pdf",
  upsert: true,
});

if (error) {
  console.error("Upload failed:", error.message);
  process.exit(1);
}

const {
  data: { publicUrl },
} = supabase.storage.from(BUCKET).getPublicUrl(OBJECT);

console.log(`Uploaded ${(pdf.length / 1024).toFixed(1)} KB -> ${BUCKET}/${OBJECT}`);
console.log(`Public URL: ${publicUrl}`);
