'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect('/login?error=Invalid email or password')
  }

  revalidatePath('/', 'layout')
  redirect('/manage')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const headersList = await (await import('next/headers')).headers()
  const origin = headersList.get('origin')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login/reset-password`,
  })

  if (error) {
    return redirect(`/login/forgot-password?error=${error.message}`)
  }

  return redirect('/login/forgot-password?success=Check your email for the reset link')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return redirect(`/login/reset-password?error=${error.message}`)
  }

  return redirect('/login?success=Password updated successfully')
}
