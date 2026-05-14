import { createAdminClient } from "@/utils/supabase/admin";
import { AnnouncementBarClient } from "./AnnouncementBarClient";

export async function AnnouncementBar() {
  const adminDb = createAdminClient();
  
  // Fetch all site settings
  const { data: rows } = await adminDb
    .from("site_settings")
    .select("key, value");

  if (!rows) return null;

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value ?? "";
  }

  const isEnabled = settings["announcement_enabled"] === "true";
  const text = settings["announcement_text"];
  const link = settings["announcement_link"];

  if (!isEnabled || !text) {
    return null;
  }

  return <AnnouncementBarClient text={text} link={link} />;
}
