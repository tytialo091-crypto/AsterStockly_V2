import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (error) return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, request.url))
  if (!code) return NextResponse.redirect(new URL('/auth?error=missing_code', request.url))

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL(exchangeError ? `/auth?error=callback_failed` : '/', request.url))
}
