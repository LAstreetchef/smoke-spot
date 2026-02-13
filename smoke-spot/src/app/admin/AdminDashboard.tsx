'use client'

import { useState } from 'react'

interface Campaign {
  id: string
  name: string
  ad_type: string
  budget_cents: number
  spent_cents: number
  status: string
  created_at: string
  advertiser: { business_name: string; user_id: string; user: { email: string } | null } | null
}

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  total_earned_cents: number
  total_paid_cents: number
  stripe_onboarding_complete: boolean
  status: string
  user: { email: string; username: string; paypal_email: string | null; venmo_username: string | null } | null
}

interface Commission {
  id: string
  payment_amount_cents: number
  commission_amount_cents: number
  commission_rate: number
  status: string
  created_at: string
  paid_at: string | null
  campaign: { name: string } | null
}

interface Stats {
  totalRevenue: number
  totalCommissions: number
  activeAds: number
  totalAffiliates: number
}

interface Debug {
  campaignsCount: number
  campaignsError: string | null
  affiliatesCount: number
  envKeyExists: boolean
  supabaseUrl: string
}

interface Props {
  campaigns: Campaign[]
  affiliates: Affiliate[]
  commissions: Commission[]
  stats: Stats
  userEmail: string
  debug?: Debug
}

export default function AdminDashboard({ campaigns: initialCampaigns, affiliates, commissions, stats, userEmail, debug }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'affiliates' | 'payouts'>('overview')
  const [toast, setToast] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [updating, setUpdating] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleCampaign = async (campaignId: string, currentStatus: string) => {
    setUpdating(campaignId)
    const action = currentStatus === 'active' ? 'pause' : 'activate'
    
    try {
      const res = await fetch('/api/admin/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, action })
      })
      const data = await res.json()
      
      if (data.success) {
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, status: data.status } : c
        ))
        showToast(`Campaign ${action}d`)
      } else {
        showToast(`Error: ${data.error}`)
      }
    } catch (err) {
      showToast('Failed to update campaign')
    }
    setUpdating(null)
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">🔥 Smoke Spot Admin</h1>
          <span className="text-sm text-white/60">{userEmail}</span>
        </div>
      </header>

      {/* Debug Info */}
      {debug && (
        <div className="bg-yellow-500/20 text-yellow-300 text-xs p-2 font-mono">
          DEBUG: campaigns={debug.campaignsCount} | affiliates={debug.affiliatesCount} | envKey={debug.envKeyExists ? 'YES' : 'NO'} | url={debug.supabaseUrl} | error={debug.campaignsError || 'none'}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-green-500 text-white font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {(['overview', 'campaigns', 'affiliates', 'payouts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab 
                  ? 'text-green-400 border-b-2 border-green-400' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-white/60">Total Revenue</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-400">{formatCurrency(stats.totalCommissions)}</p>
                <p className="text-sm text-white/60">Commissions Paid</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-3xl font-bold text-yellow-400">{stats.activeAds}</p>
                <p className="text-sm text-white/60">Active Ads</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-3xl font-bold text-purple-400">{stats.totalAffiliates}</p>
                <p className="text-sm text-white/60">Affiliates</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Recent Commissions</h3>
              {commissions.length === 0 ? (
                <p className="text-white/40">No commissions yet</p>
              ) : (
                <div className="space-y-2">
                  {commissions.slice(0, 5).map(c => (
                    <div key={c.id} className="flex justify-between items-center py-2 border-b border-white/5">
                      <div>
                        <p className="text-sm">{c.campaign?.name || 'Unknown'}</p>
                        <p className="text-xs text-white/40">{formatDate(c.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-medium">{formatCurrency(c.commission_amount_cents)}</p>
                        <p className="text-xs text-white/40">{c.commission_rate}% of {formatCurrency(c.payment_amount_cents)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">All Campaigns ({campaigns.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-2 px-2">Name</th>
                    <th className="py-2 px-2">Advertiser</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Budget</th>
                    <th className="py-2 px-2">Spent</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Created</th>
                    <th className="py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2">{c.name}</td>
                      <td className="py-2 px-2">
                        <div>{c.advertiser?.business_name || '-'}</div>
                        {c.advertiser?.user?.email && (
                          <div className="text-xs text-white/40">{c.advertiser.user.email}</div>
                        )}
                      </td>
                      <td className="py-2 px-2">{c.ad_type}</td>
                      <td className="py-2 px-2">{formatCurrency(c.budget_cents)}</td>
                      <td className="py-2 px-2">{formatCurrency(c.spent_cents)}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          c.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          c.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-white/40">{formatDate(c.created_at)}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => toggleCampaign(c.id, c.status)}
                          disabled={updating === c.id}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            c.status === 'active' 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          } disabled:opacity-50`}
                        >
                          {updating === c.id ? '...' : c.status === 'active' ? '⏸ Pause' : '▶ Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Affiliates Tab */}
        {activeTab === 'affiliates' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">All Affiliates ({affiliates.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-2 px-2">User</th>
                    <th className="py-2 px-2">Code</th>
                    <th className="py-2 px-2">Earned</th>
                    <th className="py-2 px-2">Paid</th>
                    <th className="py-2 px-2">Stripe</th>
                    <th className="py-2 px-2">PayPal</th>
                    <th className="py-2 px-2">Venmo</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map(a => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2">{a.user?.email || '-'}</td>
                      <td className="py-2 px-2 font-mono text-xs">{a.referral_code}</td>
                      <td className="py-2 px-2 text-green-400">{formatCurrency(a.total_earned_cents)}</td>
                      <td className="py-2 px-2">{formatCurrency(a.total_paid_cents)}</td>
                      <td className="py-2 px-2">
                        {a.stripe_onboarding_complete ? '✅' : '❌'}
                      </td>
                      <td className="py-2 px-2 text-white/60">{a.user?.paypal_email || '-'}</td>
                      <td className="py-2 px-2 text-white/60">{a.user?.venmo_username || '-'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          a.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Pending Manual Payouts</h2>
            <p className="text-white/60 text-sm">Affiliates without Stripe who have PayPal/Venmo configured</p>
            
            <div className="space-y-4">
              {affiliates
                .filter(a => !a.stripe_onboarding_complete && (a.user?.paypal_email || a.user?.venmo_username) && a.total_earned_cents > a.total_paid_cents)
                .map(a => {
                  const pending = a.total_earned_cents - a.total_paid_cents
                  return (
                    <div key={a.id} className="bg-white/5 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{a.user?.email}</p>
                          <p className="text-sm text-white/60">@{a.user?.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">{formatCurrency(pending)}</p>
                          <p className="text-xs text-white/40">pending payout</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {a.user?.paypal_email && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(a.user!.paypal_email!)
                              showToast(`Copied: ${a.user!.paypal_email}`)
                            }}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                          >
                            💰 PayPal: {a.user.paypal_email}
                          </button>
                        )}
                        {a.user?.venmo_username && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(a.user!.venmo_username!)
                              showToast(`Copied: ${a.user!.venmo_username}`)
                            }}
                            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium"
                          >
                            📱 Venmo: {a.user.venmo_username}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              {affiliates.filter(a => !a.stripe_onboarding_complete && (a.user?.paypal_email || a.user?.venmo_username) && a.total_earned_cents > a.total_paid_cents).length === 0 && (
                <p className="text-white/40 text-center py-8">No pending manual payouts</p>
              )}
            </div>

            <h2 className="text-lg font-semibold mt-8">All Commissions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Campaign</th>
                    <th className="py-2 px-2">Payment</th>
                    <th className="py-2 px-2">Commission</th>
                    <th className="py-2 px-2">Rate</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 text-white/60">{formatDate(c.created_at)}</td>
                      <td className="py-2 px-2">{c.campaign?.name || '-'}</td>
                      <td className="py-2 px-2">{formatCurrency(c.payment_amount_cents)}</td>
                      <td className="py-2 px-2 text-green-400">{formatCurrency(c.commission_amount_cents)}</td>
                      <td className="py-2 px-2">{c.commission_rate}%</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          c.status === 'transferred' ? 'bg-green-500/20 text-green-400' :
                          c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
