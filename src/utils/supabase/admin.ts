import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS. ONLY use in Server Components/Actions.
 * NEVER import this in a file that has "use client".
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set. Add it to .env.local from Supabase Dashboard → API Keys.'
    )
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
