'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Shared admin check used by all /manage server actions.
 * Uses service-role client to bypass RLS on the admins table.
 * Returns the user-scoped supabase client for subsequent queries.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const adminDb = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized: not logged in')

  const { data: admin } = await adminDb
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase() ?? '')
    .maybeSingle()

  if (!admin) throw new Error('Unauthorized: not an admin')

  return supabase
}
