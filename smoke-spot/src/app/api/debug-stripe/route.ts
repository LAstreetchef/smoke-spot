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

  const keyInfo = {
    length: key.length,
    prefix: key.substring(0, 15),
    suffix: key.substring(key.length - 5),
    hasNewline: key.includes('\n'),
    hasSpace: key.includes(' '),
  };

  try {
    const stripe = new Stripe(key.trim());
    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    
    return NextResponse.json({ 
      success: true, 
      intent_id: intent.id,
      keyInfo
    });
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown',
      keyInfo
    });
  }
}
