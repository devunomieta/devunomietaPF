import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminDb = createAdminClient()
  const { data: settingsRows } = await adminDb.from('site_settings').select('key, value')

  const settings: Record<string, string> = {}
  for (const row of settingsRows || []) {
    settings[row.key] = row.value ?? ''
  }

  const faviconUrl = settings['favicon_url'] || settings['logo_url']

  if (faviconUrl) {
    const imageRes = await fetch(faviconUrl)
    if (imageRes.ok) {
      return new Response(imageRes.body, {
        headers: {
          'Content-Type': imageRes.headers.get('content-type') || 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }
  }

  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>',
    {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  )
}
