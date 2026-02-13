import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_TIPS_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Check if this is a feed tip
    if (paymentIntent.metadata?.type !== 'feed_tip') {
      return NextResponse.json({ received: true });
    }

    const { post_id, sender_id, recipient_id } = paymentIntent.metadata;
    const amountCents = paymentIntent.amount;

    try {
      // Call the record_tip RPC
      const { data, error } = await supabaseAdmin.rpc('record_tip', {
        p_post_id: post_id,
        p_sender_id: sender_id,
        p_amount_cents: amountCents,
        p_stripe_payment_intent_id: paymentIntent.id,
      });

      if (error) {
        console.error('Error recording tip:', error);
        return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 });
      }

      console.log('Tip recorded successfully:', data);
    } catch (err) {
      console.error('Error processing tip webhook:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    if (paymentIntent.metadata?.type === 'feed_tip') {
      console.log('Tip payment failed:', paymentIntent.id);
      // Could create a failed tip record here if needed
    }
  }

  return NextResponse.json({ received: true });
}
