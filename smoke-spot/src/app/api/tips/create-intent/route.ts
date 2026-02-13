// app/api/tips/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Initialize inside handler to ensure env vars are available
  // Trim to remove any trailing newlines from env vars
  const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim());
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Debug: Check if key exists
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id, amount_cents } = await req.json();

    // Validate amount
    if (!amount_cents || amount_cents < 100 || amount_cents > 100000) {
      return NextResponse.json(
        { error: 'Amount must be between $1.00 and $1,000.00' },
        { status: 400 }
      );
    }

    // Validate post exists and get recipient
    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError) {
      console.error('Post lookup error:', postError);
      return NextResponse.json({ error: `Post error: ${postError.message}` }, { status: 404 });
    }
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Cannot tip yourself
    if (post.user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot tip your own post' },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      metadata: {
        type: 'feed_tip',
        sender_id: user.id,
        recipient_id: post.user_id,
        post_id: post_id,
      },
      // Enable automatic payment methods for maximum compatibility
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err) {
    console.error('Error creating tip payment intent:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Payment failed: ${message}` },
      { status: 500 }
    );
  }
}
