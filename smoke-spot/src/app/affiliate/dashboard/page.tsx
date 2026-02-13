'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  paypal_email: string | null
  venmo_handle: string | null
  commission_rate: number
  total_earned_cents: number
  total_paid_cents: number
  status: string
}

interface Referral {
  id: string
  advertiser_id: string
  status: string
  created_at: string
  advertiser?: {
    business_name: string
  }
}

interface Commission {
  id: string
  payment_amount_cents: number
  commission_amount_cents: number
  status: string
  created_at: string
  campaign?: {
    name: string
  }
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [venmoHandle, setVenmoHandle] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/affiliate/dashboard')
      return
    }
    setUser(user)
    await fetchAffiliateData(user.id)
  }

  const fetchAffiliateData = async (userId: string) => {
    // Get affiliate record
    const { data: affiliateData } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (affiliateData) {
      setAffiliate(affiliateData)
      setPaypalEmail(affiliateData.paypal_email || '')
      setVenmoHandle(affiliateData.venmo_handle || '')

      // Fetch referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*, advertiser:advertisers(business_name)')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })

      if (referralsData) setReferrals(referralsData)

      // Fetch commissions
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('*, campaign:ad_campaigns(name)')
        .in('referral_id', referralsData?.map(r => r.id) || [])
        .order('created_at', { ascending: false })

      if (commissionsData) setCommissions(commissionsData)
    }

    setLoading(false)
  }

  const createAffiliate = async () => {
    if (!user) return
    setSaving(true)

    // Generate referral code
    const code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        referral_code: code,
        paypal_email: paypalEmail || null,
        venmo_handle: venmoHandle || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      showToast('Failed to create affiliate account', 'error')
      console.error(error)
    } else {
      setAffiliate(data)
      showToast('Affiliate account created!', 'success')
    }

    setSaving(false)
  }

  const updatePayoutInfo = async () => {
    if (!affiliate) return
    setSaving(true)

    const { error } = await supabase
      .from('affiliates')
      .update({
        paypal_email: paypalEmail || null,
        venmo_handle: venmoHandle || null,
      })
      .eq('id', affiliate.id)

    if (error) {
      showToast('Failed to update payout info', 'error')
    } else {
      showToast('Payout info updated!', 'success')
      setAffiliate({ ...affiliate, paypal_email: paypalEmail, venmo_handle: venmoHandle })
    }

    setSaving(false)
  }

  const copyReferralLink = () => {
    if (!affiliate) return
    const link = `https://findsmokespot.com/advertise?ref=${affiliate.referral_code}`
    navigator.clipboard.writeText(link)
    showToast('Referral link copied!', 'success')
  }

  const shareReferralLink = async () => {
    if (!affiliate) return
    const link = `https://findsmokespot.com/advertise?ref=${affiliate.referral_code}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Advertise on Smoke Spot',
          text: 'Reach smokers near your business with geo-targeted ads. Check it out:',
          url: link,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        copyReferralLink()
      }
    } else {
      // Fallback for browsers without share API
      copyReferralLink()
    }
  }

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-neutral/50">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-secondary/90 backdrop-blur-sm border-b border-neutral/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <img src="/logo.png" alt="Smoke Spot" className="w-8 h-8 rounded-lg shadow-md shadow-accent/30 animate-pulse" />
            <span className="font-display text-xl font-bold text-neutral">Affiliate Dashboard</span>
          </Link>
          <Link href="/app" className="text-neutral/60 hover:text-neutral text-sm">
            ← Back to Map
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Not yet an affiliate */}
        {!affiliate && (
          <div className="bg-secondary rounded-2xl p-8 border border-neutral/10">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💰</div>
              <h1 className="font-display text-2xl font-bold text-neutral mb-2">
                Become an Affiliate
              </h1>
              <p className="text-neutral/60 max-w-md mx-auto">
                Earn 15% commission on every ad purchase from businesses you refer. 
                Enter your payout info to get started.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-neutral/70 text-sm mb-2">PayPal Email</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your@paypal.com"
                  className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral focus:border-accent focus:outline-none"
                />
              </div>
              <div className="text-center text-neutral/50 text-sm">— or —</div>
              <div>
                <label className="block text-neutral/70 text-sm mb-2">Venmo Handle</label>
                <input
                  type="text"
                  value={venmoHandle}
                  onChange={(e) => setVenmoHandle(e.target.value)}
                  placeholder="@yourvenmo"
                  className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral focus:border-accent focus:outline-none"
                />
              </div>
              <button
                onClick={createAffiliate}
                disabled={saving || (!paypalEmail && !venmoHandle)}
                className="w-full px-8 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition disabled:opacity-50 mt-6"
              >
                {saving ? 'Creating...' : 'Start Earning'}
              </button>
              <p className="text-neutral/50 text-xs text-center mt-2">
                You can update your payout info anytime
              </p>
            </div>
          </div>
        )}

        {/* Active affiliate dashboard */}
        {affiliate && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
                <p className="text-neutral/50 text-sm mb-1">Total Earned</p>
                <p className="font-display text-3xl font-bold text-success">
                  {formatCents(affiliate.total_earned_cents)}
                </p>
              </div>
              <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
                <p className="text-neutral/50 text-sm mb-1">Paid Out</p>
                <p className="font-display text-3xl font-bold text-neutral">
                  {formatCents(affiliate.total_paid_cents)}
                </p>
              </div>
              <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
                <p className="text-neutral/50 text-sm mb-1">Pending</p>
                <p className="font-display text-3xl font-bold text-accent">
                  {formatCents(affiliate.total_earned_cents - affiliate.total_paid_cents)}
                </p>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-secondary rounded-xl p-6 border border-neutral/10 mb-8">
              <h3 className="font-display text-lg font-bold text-neutral mb-4">
                Your Referral Link
              </h3>
              <div className="flex gap-2 items-stretch">
                <input
                  type="text"
                  readOnly
                  value={`https://findsmokespot.com/advertise?ref=${affiliate.referral_code}`}
                  className="flex-1 min-w-0 px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral text-sm truncate"
                />
                <button
                  onClick={copyReferralLink}
                  className="flex-shrink-0 px-4 py-3 bg-accent/20 text-accent rounded-lg font-medium hover:bg-accent/30 transition flex items-center gap-1.5"
                >
                  <span>📋</span><span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={shareReferralLink}
                  className="flex-shrink-0 px-4 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition flex items-center gap-1.5"
                >
                  <span>📤</span><span className="hidden sm:inline">Share</span>
                </button>
              </div>
              <p className="text-neutral/50 text-sm mt-3">
                Share this link with local businesses. You earn {affiliate.commission_rate}% on every ad purchase they make!
              </p>
            </div>

            {/* Payout Info */}
            <div className="bg-secondary rounded-xl p-6 border border-neutral/10 mb-8">
              <h3 className="font-display text-lg font-bold text-neutral mb-4">
                Payout Info
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral/70 text-sm mb-2">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your@paypal.com"
                    className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral/70 text-sm mb-2">Venmo Handle</label>
                  <input
                    type="text"
                    value={venmoHandle}
                    onChange={(e) => setVenmoHandle(e.target.value)}
                    placeholder="@yourvenmo"
                    className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={updatePayoutInfo}
                disabled={saving}
                className="mt-4 px-6 py-2 bg-accent/20 text-accent rounded-lg font-medium hover:bg-accent/30 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Payout Info'}
              </button>
              <p className="text-neutral/50 text-sm mt-3">
                💸 Payouts are sent monthly for balances over $25
              </p>
            </div>

            {/* Referrals Table */}
            <div className="bg-secondary rounded-xl border border-neutral/10 mb-8">
              <div className="px-6 py-4 border-b border-neutral/10">
                <h3 className="font-display text-lg font-bold text-neutral">
                  Your Referrals ({referrals.length})
                </h3>
              </div>
              {referrals.length === 0 ? (
                <div className="px-6 py-12 text-center text-neutral/50">
                  No referrals yet. Share your link to start earning!
                </div>
              ) : (
                <div className="divide-y divide-neutral/10">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-neutral font-medium">
                          {referral.advertiser?.business_name || 'Business'}
                        </p>
                        <p className="text-neutral/50 text-sm">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        referral.status === 'confirmed' 
                          ? 'bg-success/20 text-success'
                          : 'bg-accent/20 text-accent'
                      }`}>
                        {referral.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commissions Table */}
            <div className="bg-secondary rounded-xl border border-neutral/10">
              <div className="px-6 py-4 border-b border-neutral/10">
                <h3 className="font-display text-lg font-bold text-neutral">
                  Commission History
                </h3>
              </div>
              {commissions.length === 0 ? (
                <div className="px-6 py-12 text-center text-neutral/50">
                  No commissions yet. You'll earn when your referrals run ads!
                </div>
              ) : (
                <div className="divide-y divide-neutral/10">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-neutral font-medium">
                          {commission.campaign?.name || 'Campaign'}
                        </p>
                        <p className="text-neutral/50 text-sm">
                          {new Date(commission.created_at).toLocaleDateString()} • 
                          Ad spend: {formatCents(commission.payment_amount_cents)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-success font-bold">
                          +{formatCents(commission.commission_amount_cents)}
                        </p>
                        <span className={`text-xs ${
                          commission.status === 'paid' 
                            ? 'text-success'
                            : 'text-neutral/50'
                        }`}>
                          {commission.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function AffiliateDashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-neutral/50">Loading...</div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}
