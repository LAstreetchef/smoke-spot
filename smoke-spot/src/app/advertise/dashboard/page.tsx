'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Campaign {
  id: string
  name: string
  ad_type: string
  status: string
  budget_cents: number
  spent_cents: number
  start_date: string
  end_date: string
  created_at: string
}

interface Advertiser {
  id: string
  business_name: string
  business_type: string
  is_verified: boolean
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    loadDashboard()
    // Check for payment success
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      // Clear URL params
      window.history.replaceState({}, '', '/advertise/dashboard')
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/advertise/dashboard')
      return
    }

    // Get advertiser profile (use first one if multiple exist)
    const { data: advertiserList } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    const advertiserData = advertiserList?.[0] || null

    if (!advertiserData) {
      router.push('/advertise/signup')
      return
    }

    setAdvertiser(advertiserData)

    // Get campaigns
    const { data: campaignsData } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('advertiser_id', advertiserData.id)
      .order('created_at', { ascending: false })

    if (campaignsData) {
      setCampaigns(campaignsData)

      // Calculate totals
      const totalSpent = campaignsData.reduce((sum, c) => sum + (c.spent_cents || 0), 0)
      setStats(prev => ({ ...prev, totalSpent }))
    }

    // Get impression/click counts
    if (campaignsData && campaignsData.length > 0) {
      const { data: events } = await supabase
        .from('ad_events')
        .select('event_type, campaign_id')
        .in('campaign_id', campaignsData.map(c => c.id))

      if (events) {
        const impressions = events.filter(e => e.event_type === 'impression').length
        const clicks = events.filter(e => e.event_type === 'click').length
        setStats(prev => ({ ...prev, totalImpressions: impressions, totalClicks: clicks }))
      }
    }

    setLoading(false)
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success'
      case 'paused': return 'bg-yellow-500/20 text-yellow-500'
      case 'completed': return 'bg-neutral/20 text-neutral/60'
      default: return 'bg-neutral/20 text-neutral/60'
    }
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
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-success text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-pulse">
          ✅ Payment successful! Your campaign is now active.
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="text-neutral/50 hover:text-neutral">
              ← App
            </Link>
            <span className="text-neutral/30">|</span>
            <span className="font-display font-bold text-neutral">{advertiser?.business_name}</span>
            {advertiser?.is_verified && (
              <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">✓ Verified</span>
            )}
          </div>
          <Link
            href="/advertise/campaign/new"
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition"
          >
            + New Campaign
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Total Spent</p>
            <p className="font-display text-3xl font-bold text-neutral">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Impressions</p>
            <p className="font-display text-3xl font-bold text-neutral">
              {stats.totalImpressions.toLocaleString()}
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-6 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Clicks</p>
            <p className="font-display text-3xl font-bold text-neutral">
              {stats.totalClicks.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Campaigns */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-neutral">Campaigns</h2>
        </div>

        {campaigns.length > 0 ? (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/advertise/campaign/${campaign.id}`}
                className="block bg-secondary rounded-xl p-4 border border-neutral/10 hover:border-accent/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-neutral">{campaign.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-neutral/50 text-sm">
                      {campaign.ad_type.replace('_', ' ')} • {formatCurrency(campaign.spent_cents)} / {formatCurrency(campaign.budget_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-neutral/70 text-sm">
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-primary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min((campaign.spent_cents / campaign.budget_cents) * 100, 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-secondary rounded-xl p-12 border border-neutral/10 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-display text-lg font-bold text-neutral mb-2">No Campaigns Yet</h3>
            <p className="text-neutral/60 mb-6">Create your first campaign to start reaching smokers</p>
            <Link
              href="/advertise/campaign/new"
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition"
            >
              Create Campaign
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default function AdvertiserDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary flex items-center justify-center"><div className="text-neutral">Loading...</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}
