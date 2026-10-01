"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";

const RESERVED_SLUGS = new Set([
  "crm",
  "manage",
  "admin",
  "api",
  "blog",
  "projects",
  "contact",
  "auth",
  "login",
  "academic",
  "experience",
  "privacy",
  "terms",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "dashboard",
]);

export type ShortLinkRecord = {
  id: string;
  slug: string;
  original_url: string;
  title: string | null;
  channel: string;
  click_count: number;
  created_at: string;
  updated_at: string;
};

/**
 * Generates an alphanumeric random slug or sequential doc code (e.g. doc002, x9k2m)
 */
export async function generateSuggestedSlug(prefix: string = "doc"): Promise<string> {
  const adminDb = createAdminClient();
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "link";

  // Try sequential doc pattern first if prefix is doc
  if (cleanPrefix === "doc") {
    const { count } = await adminDb
      .from("site_settings")
      .select("key", { count: "exact", head: true })
      .like("key", "shortlink:doc%");

    const nextNum = (count || 0) + 1;
    const formattedNum = String(nextNum).padStart(3, "0");
    const candidate = `doc${formattedNum}`;

    // Verify candidate
    const isAvail = await isSlugAvailable(candidate);
    if (isAvail) return candidate;
  }

  // Fallback to random 5-6 char alphanumeric
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  for (let i = 0; i < 5; i++) {
    let rand = "";
    for (let c = 0; c < 5; c++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `${cleanPrefix}${rand}`;
    const isAvail = await isSlugAvailable(candidate);
    if (isAvail) return candidate;
  }

  return `${cleanPrefix}${Date.now().toString(36).slice(-4)}`;
}

/**
 * Checks if a slug is available and not reserved
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const clean = slug.trim().toLowerCase();
  if (!clean || RESERVED_SLUGS.has(clean)) return false;
  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(clean)) return false;

  const adminDb = createAdminClient();
  const { data } = await adminDb
    .from("site_settings")
    .select("key")
    .eq("key", `shortlink:${clean}`)
    .maybeSingle();

  return !data;
}

/**
 * Real-time slug availability check for UI debounce
 */
export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; error?: string }> {
  await requireCrmUser({ page: "campaigns" });
  const clean = slug.trim().toLowerCase();

  if (!clean) {
    return { available: false, error: "Slug cannot be empty." };
  }

  if (RESERVED_SLUGS.has(clean)) {
    return { available: false, error: `"${clean}" is a reserved system path.` };
  }

  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(clean)) {
    return { available: false, error: "Slug must be 2-40 characters (letters, numbers, hyphens, underscores)." };
  }

  const available = await isSlugAvailable(clean);
  if (!available) {
    return { available: false, error: `"${clean}" is already in use. Please pick another.` };
  }

  return { available: true };
}

/**
 * Create or update a custom shortened link
 */
export async function createShortLink({
  originalUrl,
  customSlug,
  title,
  channel = "email",
}: {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  channel?: "email" | "whatsapp" | "manual";
}): Promise<{ success: true; slug: string; shortUrl: string } | { error: string }> {
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const adminDb = createAdminClient();

  const trimmedUrl = originalUrl?.trim();
  if (!trimmedUrl) {
    return { error: "Destination URL is required." };
  }

  // Ensure protocol is valid
  let validatedUrl = trimmedUrl;
  if (!/^https?:\/\//i.test(validatedUrl)) {
    validatedUrl = `https://${validatedUrl}`;
  }

  try {
    new URL(validatedUrl);
  } catch {
    return { error: "Please enter a valid URL." };
  }

  let finalSlug = customSlug?.trim().toLowerCase();
  if (finalSlug) {
    if (RESERVED_SLUGS.has(finalSlug)) {
      return { error: `"${finalSlug}" is a reserved system route.` };
    }
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(finalSlug)) {
      return { error: "Custom slug must be 2-40 characters containing letters, numbers, hyphens, or underscores." };
    }
    const avail = await isSlugAvailable(finalSlug);
    if (!avail) {
      return { error: `Slug "${finalSlug}" is already taken. Please choose another.` };
    }
  } else {
    finalSlug = await generateSuggestedSlug("doc");
  }

  const key = `shortlink:${finalSlug}`;
  const payload = {
    slug: finalSlug,
    original_url: validatedUrl,
    title: title?.trim() || null,
    channel,
    click_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminDb
    .from("site_settings")
    .upsert({ key, value: JSON.stringify(payload) }, { onConflict: "key" });

  if (error) {
    return { error: `Failed to create short link: ${error.message}` };
  }

  const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://devunomieta.xyz";
  const shortUrl = `${domain.replace(/\/+$/, "")}/${finalSlug}`;

  return {
    success: true,
    slug: finalSlug,
    shortUrl,
  };
}

/**
 * Resolves a short link slug and increments its click counter
 */
export async function resolveShortLinkAndTrack(slug: string): Promise<string | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean || RESERVED_SLUGS.has(clean)) return null;

  const adminDb = createAdminClient();
  const key = `shortlink:${clean}`;

  const { data } = await adminDb
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data || !data.value) return null;

  try {
    const record = JSON.parse(data.value);
    const destination = record.original_url;

    // Asynchronously increment click count
    (async () => {
      try {
        record.click_count = (record.click_count || 0) + 1;
        record.updated_at = new Date().toISOString();
        await adminDb
          .from("site_settings")
          .update({ value: JSON.stringify(record) })
          .eq("key", key);
      } catch (trackErr) {
        console.error("Short link track error:", trackErr);
      }
    })();

    return destination;
  } catch {
    // If stored as raw string URL fallback
    return data.value.startsWith("http") ? data.value : null;
  }
}
