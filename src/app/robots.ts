import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/manage/', '/auth/'],
    },
    sitemap: 'https://www.devunomieta.xyz/sitemap.xml',
  }
}
