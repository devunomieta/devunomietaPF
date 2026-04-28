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
  
  // Verify session first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized: not logged in')

  // Use service role to check admin status
  const adminDb = createAdminClient()
  const { data: admin, error: adminError } = await adminDb
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase() ?? '')
    .maybeSingle()

  if (adminError) {
    console.error('Admin check error:', adminError)
    // If we can't even check the admins table with the service role, 
    // it's a major configuration issue.
    throw new Error(`Admin verification failed: ${adminError.message}`)
  }

  if (!admin) {
    throw new Error(`Unauthorized: ${user.email} is not registered as an administrator.`)
  }

  return supabase
}
