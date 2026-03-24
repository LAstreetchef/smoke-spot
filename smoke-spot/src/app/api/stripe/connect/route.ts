import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { returnUrl } = await request.json()
    
    // Get user from auth header/cookie
    const authHeader = request.headers.get('cookie')
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { cookie: authHeader || '' }
        }
      }
    )
    
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if affiliate exists
    let { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let stripeAccountId = affiliate?.stripe_account_id

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          user_id: user.id
        }
      })
      stripeAccountId = account.id

      // Create or update affiliate record
      if (affiliate) {
        await supabase
          .from('affiliates')
          .update({ stripe_account_id: stripeAccountId })
          .eq('id', affiliate.id)
      } else {
        // Generate referral code
        const { data: codeData } = await supabase.rpc('generate_referral_code')
        const referralCode = codeData || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        
        await supabase
          .from('affiliates')
          .insert({
            user_id: user.id,
            stripe_account_id: stripeAccountId,
            referral_code: referralCode,
            status: 'pending'
          })
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: returnUrl || 'https://findsmokespot.com/app/profile',
      return_url: returnUrl || 'https://findsmokespot.com/app/profile',
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: 'Failed to create Stripe account' }, { status: 500 })
  }
}
