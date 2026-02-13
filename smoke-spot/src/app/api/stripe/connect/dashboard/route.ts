import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
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

    // Get affiliate with Stripe account
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single()

    if (!affiliate?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
    }

    // Create login link for Stripe Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(affiliate.stripe_account_id)

    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error('Stripe dashboard error:', error)
    return NextResponse.json({ error: 'Failed to create dashboard link' }, { status: 500 })
  }
}
