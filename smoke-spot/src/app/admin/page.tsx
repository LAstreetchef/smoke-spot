import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './AdminDashboard'

const ADMIN_EMAIL = 'kammiceli@gmail.com'

export default async function AdminPage() {
  // Service role client - create inside function for proper env access
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  if (user.email !== ADMIN_EMAIL) {
    redirect('/app')
  }

  // Fetch all data with service role (bypasses RLS)
  const [campaignsRes, affiliatesRes, commissionsRes] = await Promise.all([
    adminSupabase.from('ad_campaigns').select('*, advertiser:advertisers(business_name, user_id, user:users(email))').order('created_at', { ascending: false }),
    adminSupabase.from('affiliates').select('*, user:users(email, username, paypal_email, venmo_username)').order('total_earned_cents', { ascending: false }),
    adminSupabase.from('commissions').select('*, campaign:ad_campaigns(name)').order('created_at', { ascending: false }).limit(50),
  ])

  // Debug logging
  console.log('Admin page - campaigns:', campaignsRes.data?.length, campaignsRes.error)
  console.log('Admin page - affiliates:', affiliatesRes.data?.length, affiliatesRes.error)
  console.log('Admin page - env check:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  // If there's an error, it might be env var issue
  if (campaignsRes.error) {
    console.error('Campaigns error:', campaignsRes.error)
  }

  const campaigns = (campaignsRes.data || []).map(c => {
    const advertiser = Array.isArray(c.advertiser) ? c.advertiser[0] : c.advertiser
    if (advertiser?.user) {
      advertiser.user = Array.isArray(advertiser.user) ? advertiser.user[0] : advertiser.user
    }
    return { ...c, advertiser }
  })
  
  const affiliates = (affiliatesRes.data || []).map(a => ({
    ...a,
    user: Array.isArray(a.user) ? a.user[0] : a.user
  }))

  const commissions = commissionsRes.data || []

  // Calculate stats
  const totalRevenue = campaigns.reduce((sum: number, c: any) => sum + (c.budget_cents || 0), 0)
  const totalCommissions = commissions.reduce((sum: number, c: any) => sum + (c.commission_amount_cents || 0), 0)
  const activeAds = campaigns.filter((c: any) => c.status === 'active').length
  const totalAffiliates = affiliates.length

  const stats = { totalRevenue, totalCommissions, activeAds, totalAffiliates }

  // Pass debug info
  const debug = {
    campaignsCount: campaignsRes.data?.length || 0,
    campaignsError: campaignsRes.error?.message || null,
    affiliatesCount: affiliatesRes.data?.length || 0,
    envKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'missing'
  }

  return (
    <AdminDashboard 
      campaigns={campaigns}
      affiliates={affiliates}
      commissions={commissions}
      stats={stats}
      userEmail={user.email || ''}
      debug={debug}
    />
  )
}
