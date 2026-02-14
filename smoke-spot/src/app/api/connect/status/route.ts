// Check Stripe Connect account status
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
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

    const { data: userData } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!userData?.stripe_account_id) {
      return NextResponse.json({ 
        connected: false, 
        message: 'No Stripe account connected' 
      });
    }

    // Get account details
    const account = await stripe.accounts.retrieve(userData.stripe_account_id);

    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      account_id: account.id,
    });
  } catch (err) {
    console.error('Connect status error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
