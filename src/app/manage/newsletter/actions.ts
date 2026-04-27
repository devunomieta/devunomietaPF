'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/brevo'
import { requireAdmin } from '@/lib/requireAdmin'

// ── Public ──────────────────────────────────────────────────────────────────
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

// ── Admin: Subscribers ───────────────────────────────────────────────────────
export async function deleteSubscriber(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('subscribers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

// ── Admin: Campaigns ─────────────────────────────────────────────────────────
export async function saveCampaign(formData: FormData, id?: string) {
  const supabase = await requireAdmin()
  const campaignData = {
    title: formData.get('title') as string,
    subject: formData.get('subject') as string,
    content: formData.get('content') as string,
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

export async function deleteCampaign(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

export async function sendCampaignAction(id: string) {
  const supabase = await requireAdmin()

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (!campaign) return { error: 'Campaign not found' }

  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('email, name')
    .eq('status', 'active')
  if (!subscribers || subscribers.length === 0) return { error: 'No active subscribers found' }

  const result = await sendEmail({
    to: subscribers.map(s => ({ email: s.email, name: s.name })),
    subject: campaign.subject,
    htmlContent: campaign.content,
  })

  if (result.error) return { error: result.error }

  await supabase.from('campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/manage/newsletter')
  return { success: true }
}
