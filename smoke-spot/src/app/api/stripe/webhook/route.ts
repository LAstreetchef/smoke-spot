import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Use service role for webhook (no user context)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const campaignId = session.metadata?.campaignId
      const amountPaid = session.amount_total || 0

      if (campaignId) {
        // Update campaign status to active and record payment
        const { error } = await supabase
          .from('ad_campaigns')
          .update({
            status: 'active',
            budget_cents: amountPaid,
            stripe_payment_id: session.payment_intent as string,
          })
          .eq('id', campaignId)

        if (error) {
          console.error('Failed to update campaign:', error)
        } else {
          console.log(`Campaign ${campaignId} activated with budget $${amountPaid / 100}`)

          // Process affiliate commission
          try {
            // Get the campaign's advertiser
            const { data: campaign } = await supabase
              .from('ad_campaigns')
              .select('advertiser_id')
              .eq('id', campaignId)
              .single()

            if (campaign) {
              // Check if advertiser was referred
              const { data: referral } = await supabase
                .from('referrals')
                .select('id, affiliate:affiliates(id, stripe_account_id, commission_rate, user_id)')
                .eq('advertiser_id', campaign.advertiser_id)
                .eq('status', 'confirmed')
                .single()

              const affiliateData = Array.isArray(referral?.affiliate) ? referral.affiliate[0] : referral?.affiliate
              if (referral && affiliateData?.stripe_account_id) {
                const affiliate = affiliateData as any
                const commissionRate = affiliate.commission_rate || 15
                const commissionAmount = Math.floor(amountPaid * (commissionRate / 100))

                if (commissionAmount > 0) {
                  // Transfer commission to affiliate's Stripe Connect account
                  const transfer = await stripe.transfers.create({
                    amount: commissionAmount,
                    currency: 'usd',
                    destination: affiliate.stripe_account_id,
                    metadata: {
                      campaign_id: campaignId,
                      referral_id: referral.id,
                      affiliate_id: affiliate.id,
                    },
                  })

                  // Record commission
                  await supabase.from('commissions').insert({
                    referral_id: referral.id,
                    campaign_id: campaignId,
                    payment_amount_cents: amountPaid,
                    commission_amount_cents: commissionAmount,
                    commission_rate: commissionRate,
                    stripe_transfer_id: transfer.id,
                    status: 'transferred',
                    paid_at: new Date().toISOString(),
                  })

                  // Update affiliate totals
                  await supabase.rpc('increment_affiliate_earnings', {
                    p_affiliate_id: affiliate.id,
                    p_amount: commissionAmount,
                  })

                  console.log(`Commission of $${commissionAmount / 100} transferred to affiliate ${affiliate.id}`)
                }
              }
            }
          } catch (commissionError) {
            console.error('Error processing commission:', commissionError)
            // Don't fail the webhook for commission errors
          }
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      console.log('Payment succeeded:', event.data.object)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
