// app/api/webhooks/stripe-tips/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_TIPS_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle Checkout Session completed (for tips via Checkout)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { type, sender_id, post_id, recipient_id } = session.metadata || {};

    if (type !== 'feed_tip') {
      return NextResponse.json({ received: true });
    }

    try {
      const amountCents = session.amount_total || 0;
      
      const { error } = await supabase.rpc('record_tip', {
        p_sender_id: sender_id,
        p_post_id: post_id,
        p_amount_cents: amountCents,
        p_stripe_payment_intent_id: session.payment_intent as string,
      });

      if (error) {
        console.error('Error recording tip:', error);
        return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 });
      }

      console.log(`Tip recorded via Checkout: ${session.id} → $${(amountCents / 100).toFixed(2)}`);
    } catch (err) {
      console.error('Error processing checkout webhook:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  // Also handle direct PaymentIntent (legacy)
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { type, sender_id, post_id } = paymentIntent.metadata;

    if (type !== 'feed_tip') {
      return NextResponse.json({ received: true });
    }

    try {
      const { error } = await supabase.rpc('record_tip', {
        p_sender_id: sender_id,
        p_post_id: post_id,
        p_amount_cents: paymentIntent.amount,
        p_stripe_payment_intent_id: paymentIntent.id,
      });

      if (error) {
        console.error('Error recording tip:', error);
      } else {
        console.log(`Tip recorded: ${paymentIntent.id} → $${(paymentIntent.amount / 100).toFixed(2)}`);
      }
    } catch (err) {
      console.error('Error processing tip webhook:', err);
    }
  }

  return NextResponse.json({ received: true });
}
