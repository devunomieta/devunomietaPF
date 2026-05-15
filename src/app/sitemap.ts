import { MetadataRoute } from 'next'
import { createAdminClient } from '@/utils/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.devunomieta.xyz'

  // Static routes to map
  const routes = [
    '',
    '/academic',
    '/experience',
    '/projects',
    '/blog',
    '/contact',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Secure fetch for dynamic blog posts
  let blogRoutes: any[] = []
  try {
    const adminDb = createAdminClient()
    const { data: posts } = await adminDb
      .from('posts')
      .select('slug, updated_at, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (posts && posts.length > 0) {
      blogRoutes = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at || post.created_at || new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    }
  } catch (e) {
    console.error('Sitemap dynamic crawling fallback triggered:', e)
  }

  return [...routes, ...blogRoutes]
}
