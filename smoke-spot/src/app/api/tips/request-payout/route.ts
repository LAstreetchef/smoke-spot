import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MIN_PAYOUT_CENTS } from '@/types/tipping';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payout_method } = await request.json();

    if (!['paypal', 'venmo'].includes(payout_method)) {
      return NextResponse.json({ error: 'Invalid payout method' }, { status: 400 });
    }

    // Get user's earnings
    const { data: earnings, error: earningsError } = await supabaseAdmin
      .from('user_earnings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (earningsError || !earnings) {
      return NextResponse.json({ error: 'No earnings found' }, { status: 404 });
    }

    // Check minimum balance
    if (earnings.pending_balance_cents < MIN_PAYOUT_CENTS) {
      return NextResponse.json({ 
        error: `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}` 
      }, { status: 400 });
    }

    // Get payout destination
    let destination: string;
    if (payout_method === 'paypal') {
      if (!earnings.paypal_email) {
        return NextResponse.json({ error: 'PayPal email not set' }, { status: 400 });
      }
      destination = earnings.paypal_email;
    } else {
      if (!earnings.venmo_username) {
        return NextResponse.json({ error: 'Venmo username not set' }, { status: 400 });
      }
      destination = earnings.venmo_username;
    }

    const payoutAmount = earnings.pending_balance_cents;

    // Create payout record
    const { error: payoutError } = await supabaseAdmin
      .from('payout_history')
      .insert({
        user_id: user.id,
        amount_cents: payoutAmount,
        payout_method,
        payout_destination: destination,
        status: 'pending',
      });

    if (payoutError) {
      console.error('Error creating payout:', payoutError);
      return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
    }

    // Zero out pending balance and add to withdrawn
    const { error: updateError } = await supabaseAdmin
      .from('user_earnings')
      .update({
        pending_balance_cents: 0,
        withdrawn_cents: earnings.withdrawn_cents + payoutAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating earnings:', updateError);
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      amount_cents: payoutAmount,
      payout_method,
      destination,
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return NextResponse.json({ error: 'Failed to request payout' }, { status: 500 });
  }
}
