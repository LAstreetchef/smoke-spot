import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// POST: Create Stripe Connect account and return onboarding URL
export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    maxNetworkRetries: 3,
    timeout: 30000,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
    }

    // Check if affiliate already exists
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single()

    let affiliateId = existingAffiliate?.id
    let stripeAccountId = existingAffiliate?.stripe_account_id

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          user_id: userId,
        },
      })
      stripeAccountId = account.id

      // Generate referral code
      const { data: codeResult } = await supabase.rpc('generate_referral_code')
      const referralCode = codeResult || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      if (existingAffiliate) {
        // Update existing affiliate
        await supabase
          .from('affiliates')
          .update({ stripe_account_id: stripeAccountId })
          .eq('id', existingAffiliate.id)
      } else {
        // Create new affiliate
        const { data: newAffiliate, error } = await supabase
          .from('affiliates')
          .insert({
            user_id: userId,
            referral_code: referralCode,
            stripe_account_id: stripeAccountId,
            status: 'pending',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating affiliate:', error)
          return NextResponse.json({ error: 'Failed to create affiliate' }, { status: 500 })
        }
        affiliateId = newAffiliate.id
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://findsmokespot.com'}/affiliate/connect?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://findsmokespot.com'}/affiliate/dashboard?connected=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: accountLink.url,
      affiliateId,
    })
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ 
      error: 'Failed to create connect account',
      details: error?.message || String(error),
      code: error?.code
    }, { status: 500 })
  }
}

// GET: Check Stripe Connect account status
export async function GET(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    maxNetworkRetries: 3,
    timeout: 30000,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!affiliate) {
      return NextResponse.json({ affiliate: null, connected: false })
    }

    let accountStatus = null
    if (affiliate.stripe_account_id) {
      const account = await stripe.accounts.retrieve(affiliate.stripe_account_id)
      accountStatus = {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      }

      // Update onboarding status if complete
      if (account.details_submitted && !affiliate.stripe_onboarding_complete) {
        await supabase
          .from('affiliates')
          .update({ 
            stripe_onboarding_complete: true,
            status: 'active'
          })
          .eq('id', affiliate.id)
        
        affiliate.stripe_onboarding_complete = true
        affiliate.status = 'active'
      }
    }

    return NextResponse.json({
      affiliate,
      connected: affiliate.stripe_onboarding_complete,
      accountStatus,
    })
  } catch (error) {
    console.error('Get affiliate error:', error)
    return NextResponse.json({ error: 'Failed to get affiliate status' }, { status: 500 })
  }
}
