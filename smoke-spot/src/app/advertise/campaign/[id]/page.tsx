'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  creative_url: string
  click_url: string
  target_lat: number
  target_lng: number
  target_radius_km: number
  created_at: string
}

interface AdEvent {
  id: string
  event_type: string
  created_at: string
  latitude: number
  longitude: number
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [events, setEvents] = useState<AdEvent[]>([])
  const [stats, setStats] = useState({
    impressions: 0,
    clicks: 0,
    ctr: 0,
  })

  useEffect(() => {
    loadCampaign()
  }, [params.id])

  const loadCampaign = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get campaign
    const { data: campaignData, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !campaignData) {
      router.push('/advertise/dashboard')
      return
    }

    setCampaign(campaignData)

    // Get events
    const { data: eventsData } = await supabase
      .from('ad_events')
      .select('*')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (eventsData) {
      setEvents(eventsData)
      const impressions = eventsData.filter(e => e.event_type === 'impression').length
      const clicks = eventsData.filter(e => e.event_type === 'click').length
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      setStats({ impressions, clicks, ctr })
    }

    setLoading(false)
  }

  const toggleStatus = async () => {
    if (!campaign) return
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    
    const { error } = await supabase
      .from('ad_campaigns')
      .update({ status: newStatus })
      .eq('id', campaign.id)

    if (!error) {
      setCampaign({ ...campaign, status: newStatus })
    }
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success'
      case 'paused': return 'bg-yellow-500/20 text-yellow-500'
      case 'completed': return 'bg-neutral/20 text-neutral/60'
      default: return 'bg-neutral/20 text-neutral/60'
    }
  }

  const getAdTypeLabel = (type: string) => {
    switch (type) {
      case 'banner': return '🖼️ Banner Ad'
      case 'sponsored_pin': return '📍 Sponsored Pin'
      case 'featured_spot': return '⭐ Featured Spot'
      case 'interstitial': return '📱 Interstitial'
      default: return type
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-neutral/50">Loading...</div>
      </main>
    )
  }

  if (!campaign) return null

  return (
    <main className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-neutral/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/advertise/dashboard" className="text-neutral/50 hover:text-neutral">
              ← Dashboard
            </Link>
          </div>
          <button
            onClick={toggleStatus}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              campaign.status === 'active'
                ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                : 'bg-success/20 text-success hover:bg-success/30'
            }`}
          >
            {campaign.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold text-neutral">{campaign.name}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-neutral/60">
              {getAdTypeLabel(campaign.ad_type)} • Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-secondary rounded-xl p-5 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Budget</p>
            <p className="font-display text-2xl font-bold text-neutral">
              {formatCurrency(campaign.budget_cents)}
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-5 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Spent</p>
            <p className="font-display text-2xl font-bold text-neutral">
              {formatCurrency(campaign.spent_cents || 0)}
            </p>
            <div className="mt-2 h-1.5 bg-primary/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full"
                style={{ width: `${Math.min(((campaign.spent_cents || 0) / campaign.budget_cents) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-secondary rounded-xl p-5 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Impressions</p>
            <p className="font-display text-2xl font-bold text-neutral">
              {stats.impressions.toLocaleString()}
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-5 border border-neutral/10">
            <p className="text-neutral/50 text-sm mb-1">Clicks (CTR)</p>
            <p className="font-display text-2xl font-bold text-neutral">
              {stats.clicks.toLocaleString()} <span className="text-sm text-neutral/50">({stats.ctr.toFixed(2)}%)</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Creative Preview */}
          <div>
            <h2 className="font-display text-lg font-bold text-neutral mb-4">Creative</h2>
            <div className="bg-secondary rounded-xl p-4 border border-neutral/10">
              {campaign.creative_url ? (
                <img 
                  src={campaign.creative_url} 
                  alt="Ad creative" 
                  className="w-full rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-32 bg-primary/50 rounded-lg flex items-center justify-center text-neutral/30 mb-4">
                  No creative
                </div>
              )}
              {campaign.click_url && (
                <div>
                  <p className="text-neutral/50 text-xs mb-1">Click URL</p>
                  <a 
                    href={campaign.click_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent text-sm hover:underline break-all"
                  >
                    {campaign.click_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Targeting */}
          <div>
            <h2 className="font-display text-lg font-bold text-neutral mb-4">Targeting</h2>
            <div className="bg-secondary rounded-xl p-4 border border-neutral/10">
              <div className="space-y-3">
                <div>
                  <p className="text-neutral/50 text-xs mb-1">Schedule</p>
                  <p className="text-neutral">
                    {new Date(campaign.start_date).toLocaleDateString()} → {new Date(campaign.end_date).toLocaleDateString()}
                  </p>
                </div>
                {campaign.target_lat && campaign.target_lng && (
                  <div>
                    <p className="text-neutral/50 text-xs mb-1">Location</p>
                    <p className="text-neutral">
                      📍 {campaign.target_lat.toFixed(4)}, {campaign.target_lng.toFixed(4)}
                    </p>
                    <p className="text-neutral/60 text-sm">
                      Radius: {campaign.target_radius_km || 10} km
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-neutral mb-4">Recent Activity</h2>
          {events.length > 0 ? (
            <div className="bg-secondary rounded-xl border border-neutral/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral/10">
                    <th className="text-left text-neutral/50 text-xs font-medium px-4 py-3">Event</th>
                    <th className="text-left text-neutral/50 text-xs font-medium px-4 py-3">Time</th>
                    <th className="text-left text-neutral/50 text-xs font-medium px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 20).map((event) => (
                    <tr key={event.id} className="border-b border-neutral/5">
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          event.event_type === 'click' 
                            ? 'bg-accent/20 text-accent' 
                            : 'bg-neutral/10 text-neutral/60'
                        }`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-neutral/70 text-sm">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-neutral/50 text-sm">
                        {event.latitude?.toFixed(2)}, {event.longitude?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-secondary rounded-xl p-8 border border-neutral/10 text-center">
              <p className="text-neutral/50">No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
