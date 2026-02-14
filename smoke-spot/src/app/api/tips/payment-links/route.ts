// Get recipient's Venmo/PayPal for direct tips
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const postId = req.nextUrl.searchParams.get('post_id');
  if (!postId) {
    return NextResponse.json({ error: 'Missing post_id' }, { status: 400 });
  }

  // Get post and recipient's payment info
  const { data: post } = await supabase
    .from('feed_posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('venmo_username, paypal_email')
    .eq('id', post.user_id)
    .single();

  return NextResponse.json({
    venmo: user?.venmo_username || null,
    paypal: user?.paypal_email || null,
    hasPayment: !!(user?.venmo_username || user?.paypal_email),
  });
}
