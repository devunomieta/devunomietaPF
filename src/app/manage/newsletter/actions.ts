'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/brevo'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: admin } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase())
    .single()
  if (!admin) throw new Error('Unauthorized')
  return supabase
}

// Public: Subscribe
export async function subscribe(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const name = formData.get('name') as string

  const { error } = await supabase
    .from('subscribers')
    .insert([{ email, name, status: 'active' }])

  if (error) {
    if (error.code === '23505') return { error: 'You are already subscribed!' }
    return { error: error.message }
  }

  return { success: true }
}

// Admin: Manage Subscribers
export async function deleteSubscriber(id: string) {
  const supabase = await checkAdmin()
  const { error } = await supabase.from('subscribers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

// Admin: Campaigns
export async function saveCampaign(formData: FormData, id?: string) {
  const supabase = await checkAdmin()
  const campaignData = {
    title: formData.get('title') as string,
    subject: formData.get('subject') as string,
    content: formData.get('content') as string,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('campaigns').update(campaignData).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('campaigns').insert([campaignData])
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

export async function sendCampaignAction(id: string) {
  const supabase = await checkAdmin()
  
  // 1. Get campaign
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (!campaign) return { error: 'Campaign not found' }

  // 2. Get active subscribers
  const { data: subscribers } = await supabase.from('subscribers').select('email, name').eq('status', 'active')
  if (!subscribers || subscribers.length === 0) return { error: 'No active subscribers found' }

  // 3. Send via Brevo
  const result = await sendEmail({
    to: subscribers.map(s => ({ email: s.email, name: s.name })),
    subject: campaign.subject,
    htmlContent: campaign.content, // We expect HTML from the editor
  })

  if (result.error) return { error: result.error }

  // 4. Update campaign status
  await supabase.from('campaigns').update({ 
    status: 'sent', 
    sent_at: new Date().toISOString() 
  }).eq('id', id)

  revalidatePath('/manage/newsletter')
  return { success: true }
}
