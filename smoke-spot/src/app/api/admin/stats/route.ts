import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'message4u@secretmessage4u.com'

// Service role client bypasses RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Use server client for proper cookie handling
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized', email: user?.email }, { status: 401 })
  }

  // Fetch all data with service role (bypasses RLS)
  const [campaignsRes, affiliatesRes, commissionsRes, advertisersRes] = await Promise.all([
    adminSupabase.from('ad_campaigns').select('*, advertiser:advertisers(business_name, email)').order('created_at', { ascending: false }),
    adminSupabase.from('affiliates').select('*, user:users(email, username, paypal_email, venmo_username)').order('total_earned_cents', { ascending: false }),
    adminSupabase.from('commissions').select('*, campaign:ad_campaigns(name)').order('created_at', { ascending: false }).limit(50),
    adminSupabase.from('advertisers').select('*').order('created_at', { ascending: false })
  ])

  const campaigns = (campaignsRes.data || []).map(c => ({
    ...c,
    advertiser: Array.isArray(c.advertiser) ? c.advertiser[0] : c.advertiser
  }))
  
  const affiliates = (affiliatesRes.data || []).map(a => ({
    ...a,
    user: Array.isArray(a.user) ? a.user[0] : a.user
  }))

  const commissions = commissionsRes.data || []
  const advertisers = advertisersRes.data || []

  // Calculate stats
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.budget_cents || 0), 0)
  const totalCommissions = commissions.reduce((sum, c) => sum + (c.commission_amount_cents || 0), 0)
  const activeAds = campaigns.filter(c => c.status === 'active').length
  const totalAffiliates = affiliates.length

  return NextResponse.json({
    campaigns,
    affiliates,
    commissions,
    advertisers,
    stats: { totalRevenue, totalCommissions, activeAds, totalAffiliates }
  })
}
