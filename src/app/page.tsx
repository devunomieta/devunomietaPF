import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()

  // Fetch everything we need for the homepage
  const [
    { data: profile },
    { count: subscriberCount },
    { count: postCount },
    { count: inquiryCount },
    { data: featuredProjects },
    { data: postDates },
    { data: inquiryDates },
    { data: projectDates },
    { data: expDates }
  ] = await Promise.all([
    supabase
      .from('profile')
      .select('name, handle, bio, avatar_url, location, email, website, titles')
      .limit(1)
      .single(),
    supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('projects')
      .select('*')
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(2),
    // For the contribution graph (Activity Aggregation)
    supabase.from('posts').select('created_at'),
    supabase.from('inquiries').select('created_at'),
    supabase.from('projects').select('created_at'),
    supabase.from('experience').select('created_at')
  ])

  // Aggregate all activity dates into a map of { YYYY-MM-DD: count }
  const activityMap: Record<string, number> = {};
  const allDates = [
    ...(postDates || []),
    ...(inquiryDates || []),
    ...(projectDates || []),
    ...(expDates || [])
  ];

  allDates.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    activityMap[date] = (activityMap[date] || 0) + 1;
  });

  const totalInteractions = (subscriberCount || 0) + (inquiryCount || 0) + (postCount || 0);
  const engagementBase = 92.4;
  const dynamicEngagement = Math.min(99.9, engagementBase + (totalInteractions / 100));

  return (
    <HomeClient 
      profile={profile} 
      stats={{
        subscribers: subscriberCount || 0,
        posts: postCount || 0,
        engagement: dynamicEngagement.toFixed(1) as any
      }}
      activityData={activityMap}
      featuredProjects={featuredProjects || []}
    />
  )
}
