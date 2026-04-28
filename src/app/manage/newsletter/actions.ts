'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/brevo'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdmin } from '@/lib/requireAdmin'

// ── Public ──────────────────────────────────────────────────────────────────
export async function subscribe(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const name = formData.get('name') as string

  // Use upsert to handle re-subscriptions
  const { error } = await supabase
    .from('subscribers')
    .upsert([{ email, name, status: 'active' }], { onConflict: 'email' })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// ── Admin: Subscribers ───────────────────────────────────────────────────────
export async function deleteSubscriber(id: string) {
  await requireAdmin()
  const adminDb = createAdminClient()
  const { error } = await adminDb.from('subscribers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

// ── Admin: Campaigns ─────────────────────────────────────────────────────────
export async function saveCampaign(formData: FormData, id?: string) {
  await requireAdmin()
  const adminDb = createAdminClient()
  const campaignData = {
    title: formData.get('title') as string,
    subject: formData.get('subject') as string,
    content: formData.get('content') as string,
  }

  let error
  if (id) {
    const { error: err } = await adminDb.from('campaigns').update(campaignData).eq('id', id)
    error = err
  } else {
    const { error: err } = await adminDb.from('campaigns').insert([campaignData])
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

export async function deleteCampaign(id: string) {
  await requireAdmin()
  const adminDb = createAdminClient()
  const { error } = await adminDb.from('campaigns').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/newsletter')
  return { success: true }
}

export async function sendCampaignAction(id: string) {
  await requireAdmin()
  const adminDb = createAdminClient()

  const { data: campaign } = await adminDb.from('campaigns').select('*').eq('id', id).single()
  if (!campaign) return { error: 'Campaign not found' }

  const { data: subscribers } = await adminDb
    .from('subscribers')
    .select('email, name')
    .eq('status', 'active')
  
  if (!subscribers || subscribers.length === 0) return { error: 'No active subscribers found' }

  // Batch sending with parallel processing to prevent timeouts
  const BATCH_SIZE = 10
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    
    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (subscriber) => {
        try {
          const result = await sendEmail({
            to: [{ email: subscriber.email, name: subscriber.name }],
            subject: campaign.subject,
            htmlContent: campaign.content,
          })
          return { email: subscriber.email, success: !!result.success, error: result.error }
        } catch (e) {
          return { email: subscriber.email, success: false, error: e }
        }
      })
    )

    results.forEach(r => {
      if (r.success) successCount++
      else {
        console.error(`Failed to send to ${r.email}:`, r.error)
        failCount++
      }
    })

    // Small cooling delay between batches
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  if (successCount === 0 && subscribers.length > 0) {
    return { error: 'Failed to send to any subscribers. Check Brevo API key and sender email.' }
  }

  await adminDb.from('campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/manage/newsletter')
  return { 
    success: true, 
    details: `Sent to ${successCount} subscribers. ${failCount} failed.` 
  }
}
