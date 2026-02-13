// Debug endpoint to test Stripe connection
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  
  if (!key) {
    return NextResponse.json({ 
      error: 'No STRIPE_SECRET_KEY',
      env_keys: Object.keys(process.env).filter(k => k.includes('STRIPE'))
    });
  }

  try {
    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    
    return NextResponse.json({ 
      success: true, 
      intent_id: intent.id,
      key_prefix: key.substring(0, 10) + '...'
    });
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown',
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}
