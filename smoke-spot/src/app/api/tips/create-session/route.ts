// app/api/tips/create-session/route.ts
// Creates a Stripe Checkout Session for tipping
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim());
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id, amount_cents } = await req.json();

    if (!amount_cents || amount_cents < 100 || amount_cents > 100000) {
      return NextResponse.json(
        { error: 'Amount must be between $1.00 and $1,000.00' },
        { status: 400 }
      );
    }

    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot tip your own post' }, { status: 400 });
    }

    // Get the origin from the request
    const origin = req.headers.get('origin') || 'https://findsmokespot.com';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '🔥 Light It Up! Tip',
              description: 'Tip for a great post on Smoke Spot',
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'feed_tip',
        sender_id: user.id,
        recipient_id: post.user_id,
        post_id: post_id,
      },
      success_url: `${origin}/app?tip_success=true&post=${post_id}`,
      cancel_url: `${origin}/app?tip_cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Payment failed: ${message}` }, { status: 500 });
  }
}
