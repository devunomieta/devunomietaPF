import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' defaults to /manage — admin login always goes to the backend
  const next = searchParams.get('next') ?? '/manage'

  if (code) {
    // DEBUG: Log all cookies to see if the PKCE cookie is missing
    console.log('Incoming Cookies on Callback:', request.headers.get('cookie'))

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Immediately redirect — code is consumed and gone from the URL
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Auth Session Error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  } else {
    // If Supabase redirected back with an error instead of a code
    const authError = searchParams.get('error')
    const authErrorDescription = searchParams.get('error_description')
    if (authError || authErrorDescription) {
      console.error('Supabase Auth Error:', authError, authErrorDescription)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Google authentication failed. Please try again.`)
}
