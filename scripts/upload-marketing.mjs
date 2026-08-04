#!/usr/bin/env node
// upload-marketing.mjs — Upload a local file to Supabase marketing-video bucket
// Usage: node --env-file=.env.local scripts/upload-marketing.mjs <local-file> [storage-name]
// Returns the public URL.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";
import { basename, extname } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const localPath = process.argv[2];
const storageName = process.argv[3] || basename(localPath);

if (!localPath) {
  console.error("Usage: node scripts/upload-marketing.mjs <local-file> [storage-name]");
  process.exit(1);
}

const buf = readFileSync(localPath);
const ext = extname(storageName).toLowerCase();
const contentType =
  ext === ".mp4" ? "video/mp4" :
  ext === ".mp3" ? "audio/mpeg" :
  ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
  ext === ".png" ? "image/png" :
  ext === ".webp" ? "image/webp" :
  "application/octet-stream";

console.log(`Uploading ${storageName} (${(buf.length / 1024 / 1024).toFixed(1)} MB)...`);

const { error } = await sb.storage
  .from("marketing-video")
  .upload(storageName, buf, { contentType, upsert: true });

if (error) {
  console.error("Upload failed:", error.message);
  process.exit(1);
}

const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/marketing-video/${storageName}`;
console.log(`OK: ${publicUrl}`);
