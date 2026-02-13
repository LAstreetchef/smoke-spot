import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { MAX_TIP_CENTS, TIP_PRESETS } from '@/types/tipping';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id, amount_cents } = await request.json();

    // Validate amount
    if (!amount_cents || amount_cents <= 0 || amount_cents > MAX_TIP_CENTS) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 });
    }

    // Get the post and verify it exists
    const { data: post, error: postError } = await supabaseAdmin
      .from('feed_posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prevent self-tipping
    if (post.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot tip your own post' }, { status: 400 });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'feed_tip',
        post_id: post_id,
        sender_id: user.id,
        recipient_id: post.user_id,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating tip intent:', error);
    return NextResponse.json({ error: 'Failed to create tip' }, { status: 500 });
  }
}
