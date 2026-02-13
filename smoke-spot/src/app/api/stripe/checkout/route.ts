import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { campaignId, amount, campaignName } = await request.json()

    if (!campaignId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify campaign belongs to this user's advertiser account
    const { data: campaign } = await supabase
      .from('ad_campaigns')
      .select('*, advertiser:advertisers(user_id)')
      .eq('id', campaignId)
      .single()

    if (!campaign || (campaign.advertiser as any)?.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Smoke Spot Ad: ${campaignName || 'Campaign'}`,
              description: `Advertising budget for campaign ID: ${campaignId}`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/advertise/dashboard?success=true&campaign=${campaignId}`,
      cancel_url: `${request.headers.get('origin')}/advertise/campaign/${campaignId}?canceled=true`,
      metadata: {
        campaignId,
        userId: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
