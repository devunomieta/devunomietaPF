'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/requireAdmin'

export async function markAsRead(id: string, isRead: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('inquiries').update({ is_read: isRead }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/inquiries')
  revalidatePath('/manage')
  return { success: true }
}

export async function deleteInquiry(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('inquiries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/inquiries')
  revalidatePath('/manage')
  return { success: true }
}

export async function replyToInquiry(id: string, email: string, name: string, message: string) {
  const supabase = await requireAdmin()
  
  // Import dynamically or configure brevo properly
  const { sendEmail } = await import('@/lib/brevo')
  
  const emailResult = await sendEmail({
    to: [{ email, name }],
    subject: `Re: Inquiry from ${name}`,
    htmlContent: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        ${message.replace(/\n/g, '<br />')}
        <br /><br />
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">
          You are receiving this email in response to your inquiry.
        </p>
      </div>
    `
  })

  if (emailResult.error) {
    return { error: emailResult.error }
  }

  // Save the reply to the database
  const { error: replyError } = await supabase.from('inquiry_replies').insert([
    {
      inquiry_id: id,
      message: message
    }
  ])

  if (replyError) return { error: replyError.message }

  const { error } = await supabase.from('inquiries').update({ 
    is_read: true,
    replied_at: new Date().toISOString()
  }).eq('id', id)
  
  if (error) return { error: error.message }
  
  revalidatePath('/manage/inquiries')
  revalidatePath('/manage')
  return { success: true }
}
