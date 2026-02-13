import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/app'
  const username = searchParams.get('username')
  const referralCode = searchParams.get('ref')
  const isSignup = searchParams.get('signup') === 'true'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      // Create user profile if it doesn't exist
      if (!existingUser) {
        // Generate a unique referral code
        const generateCode = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
          let code = ''
          for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)]
          }
          return code
        }

        // Generate username from email if not provided
        const finalUsername = username || 
          user.user_metadata?.username || 
          user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_') || 
          `user_${Date.now()}`

        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email!,
          username: finalUsername,
          avatar_url: user.user_metadata?.avatar_url || null,
          referral_code: generateCode(),
          referred_by: referralCode || null,
        })

        if (insertError) {
          console.error('Error creating user profile:', insertError)
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Return error page if something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
