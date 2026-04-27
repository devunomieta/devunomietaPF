import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profile')
    .select('name, handle, bio, avatar_url, location, email, website, titles')
    .limit(1)
    .single()

  return <HomeClient profile={profile} />
}
