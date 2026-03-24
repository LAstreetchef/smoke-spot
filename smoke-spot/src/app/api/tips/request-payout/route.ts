// app/api/tips/request-payout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MINIMUM_PAYOUT_CENTS = 500; // $5.00 minimum

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const { payout_method } = await req.json();

    if (!['paypal', 'venmo'].includes(payout_method)) {
      return NextResponse.json(
        { error: 'Invalid payout method. Use paypal or venmo.' },
        { status: 400 }
      );
    }

    // Get user's payout destination
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('paypal_email, venmo_username')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const destination = payout_method === 'paypal'
      ? userData.paypal_email
      : userData.venmo_username;

    if (!destination) {
      return NextResponse.json(
        { error: `No ${payout_method} account linked. Update your profile first.` },
        { status: 400 }
      );
    }

    // Read current balance
    const { data: earnings, error: earningsError } = await supabase
      .from('user_earnings')
      .select('pending_balance_cents, total_withdrawn_cents')
      .eq('user_id', user.id)
      .single();

    if (earningsError || !earnings) {
      return NextResponse.json({ error: 'No earnings found' }, { status: 400 });
    }

    if (earnings.pending_balance_cents < MINIMUM_PAYOUT_CENTS) {
      return NextResponse.json(
        { error: `Minimum payout is $${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}. Current balance: $${(earnings.pending_balance_cents / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    const payoutAmount = earnings.pending_balance_cents;
    const previousWithdrawn = earnings.total_withdrawn_cents || 0;

    // Atomic conditional update: only succeeds if balance hasn't changed since we read it.
    // If a concurrent request already zeroed the balance, this WHERE won't match any rows.
    const { data: updated, error: updateError } = await supabase
      .from('user_earnings')
      .update({
        pending_balance_cents: 0,
        total_withdrawn_cents: previousWithdrawn + payoutAmount,
        last_payout_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('pending_balance_cents', payoutAmount)
      .select();

    if (updateError) {
      console.error('Payout balance update error:', updateError);
      return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: 'Balance changed during request. Please try again.' },
        { status: 409 }
      );
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payout_history')
      .insert({
        user_id: user.id,
        amount_cents: payoutAmount,
        payout_method,
        payout_destination: destination,
        status: 'pending',
      })
      .select()
      .single();

    if (payoutError) {
      // Attempt to restore the balance since payout record failed
      await supabase
        .from('user_earnings')
        .update({
          pending_balance_cents: payoutAmount,
          total_withdrawn_cents: previousWithdrawn,
        })
        .eq('user_id', user.id);

      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payout_id: payout.id,
      amount: `$${(payoutAmount / 100).toFixed(2)}`,
      method: payout_method,
      destination,
      status: 'pending',
      message: 'Payout request submitted. Payouts are processed within 3-5 business days.',
    });
  } catch (err) {
    console.error('Error requesting payout:', err);
    return NextResponse.json(
      { error: 'Failed to request payout' },
      { status: 500 }
    );
  }
}
