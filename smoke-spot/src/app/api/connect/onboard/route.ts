// Create Stripe Connect onboarding link for creators
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim());
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

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

    // Check if user already has a Stripe account
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    let accountId = userData?.stripe_account_id;

    // Create new Connect account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: { user_id: user.id },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save to database
      await supabase
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    }

    // Create onboarding link
    const origin = req.headers.get('origin') || 'https://findsmokespot.com';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/app/connect?refresh=true`,
      return_url: `${origin}/app/connect?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error('Connect onboard error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
