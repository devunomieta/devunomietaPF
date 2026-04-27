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
