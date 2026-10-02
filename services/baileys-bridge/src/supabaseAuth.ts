import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds, proto } from "@whiskeysockets/baileys";
import ws from "ws";

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      transport: ws as any,
    },
  });
}

/** JSON replacer and reviver to correctly serialize Buffers and Uint8Arrays */
function bufferReplacer(_key: string, value: unknown): unknown {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { type: "Buffer", data: Array.from(value) };
  }
  return value;
}

function bufferReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && (value as { type?: string }).type === "Buffer" && Array.isArray((value as { data?: unknown[] }).data)) {
    return Buffer.from((value as { data: number[] }).data);
  }
  return value;
}

/**
 * Custom Supabase-backed AuthState adapter for Baileys.
 * Reads and persists credentials and session keys into the `crm_baileys_auth` table.
 */
export async function useSupabaseAuthState(supabase: SupabaseClient): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearCreds: () => Promise<void>;
}> {
  // 1. Fetch current creds
  const { data: credsRow } = await supabase
    .from("crm_baileys_auth")
    .select("value")
    .eq("key", "creds")
    .maybeSingle();

  let creds: AuthenticationCreds;
  if (credsRow?.value) {
    try {
      const rawString = typeof credsRow.value === "string" ? credsRow.value : JSON.stringify(credsRow.value);
      creds = JSON.parse(rawString, bufferReviver);
    } catch {
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      if (ids.length === 0) return result;

      const dbKeys = ids.map((id) => `${String(type)}-${id}`);
      const { data: rows, error } = await supabase
        .from("crm_baileys_auth")
        .select("key, value")
        .in("key", dbKeys);

      if (error) {
        console.error(`[Baileys Auth] Error reading keys for type ${String(type)}:`, error);
        return result;
      }

      for (const row of rows || []) {
        const id = row.key.replace(`${String(type)}-`, "");
        try {
          const rawString = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
          let parsed = JSON.parse(rawString, bufferReviver);
          if (type === "app-state-sync-key" && parsed) {
            parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
          }
          result[id] = parsed;
        } catch (e) {
          console.error(`[Baileys Auth] Failed to parse key ${row.key}:`, e);
        }
      }

      return result;
    },

    set: async (data: Record<string, Record<string, unknown>>): Promise<void> => {
      const upsertRows: Array<{ key: string; value: unknown; updated_at: string }> = [];
      const deleteKeys: string[] = [];

      for (const category of Object.keys(data)) {
        for (const id of Object.keys(data[category])) {
          const value = data[category][id];
          const dbKey = `${category}-${id}`;

          if (value) {
            // Serialize and revive to ensure pure JSON representation with Buffer handling
            const serialized = JSON.parse(JSON.stringify(value, bufferReplacer));
            upsertRows.push({
              key: dbKey,
              value: serialized,
              updated_at: new Date().toISOString(),
            });
          } else {
            deleteKeys.push(dbKey);
          }
        }
      }

      if (upsertRows.length > 0) {
        const { error } = await supabase.from("crm_baileys_auth").upsert(upsertRows, { onConflict: "key" });
        if (error) console.error("[Baileys Auth] Failed to save keys:", error);
      }

      if (deleteKeys.length > 0) {
        const { error } = await supabase.from("crm_baileys_auth").delete().in("key", deleteKeys);
        if (error) console.error("[Baileys Auth] Failed to delete keys:", error);
      }
    },
  };

  const saveCreds = async () => {
    try {
      const serialized = JSON.parse(JSON.stringify(creds, bufferReplacer));
      await supabase.from("crm_baileys_auth").upsert({
        key: "creds",
        value: serialized,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[Baileys Auth] Failed to save creds:", e);
    }
  };

  const clearCreds = async () => {
    try {
      await supabase.from("crm_baileys_auth").delete().neq("key", "non_existent_key");
      console.log("[Baileys Auth] Cleared all session keys from Supabase.");
    } catch (e) {
      console.error("[Baileys Auth] Failed to clear creds:", e);
    }
  };

  return {
    state: { creds, keys },
    saveCreds,
    clearCreds,
  };
}
