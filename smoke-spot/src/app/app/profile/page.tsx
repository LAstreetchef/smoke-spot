'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url: string | null
  role: string
  bio: string | null
  referral_code: string
  total_spots_created: number
  total_affiliate_earnings: number
  created_at: string
  paypal_email: string | null
  venmo_username: string | null
}

interface AffiliateProfile {
  id: string
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  total_earned_cents: number
  total_paid_cents: number
  status: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [venmoUsername, setVenmoUsername] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      showToast('Failed to load profile', 'error')
    } else if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setBio(data.bio || '')
      setPaypalEmail(data.paypal_email || '')
      setVenmoUsername(data.venmo_username || '')
    }

    // Load affiliate profile if exists
    const { data: affiliateData } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (affiliateData) {
      setAffiliate(affiliateData)
    }

    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('users')
      .update({ 
        username, 
        bio, 
        paypal_email: paypalEmail || null,
        venmo_username: venmoUsername || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', profile.id)

    if (error) {
      showToast('Failed to save changes', 'error')
    } else {
      setProfile({ ...profile, username, bio, paypal_email: paypalEmail || null, venmo_username: venmoUsername || null })
      setEditing(false)
      showToast('Profile updated!', 'success')
    }
    setSaving(false)
  }

  const copyReferralLink = () => {
    if (!profile) return
    const link = `https://findsmokespot.com/auth/signup?ref=${profile.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleConnectStripe = async () => {
    setConnectingStripe(true)
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast('Failed to start Stripe setup', 'error')
      }
    } catch (error) {
      showToast('Failed to connect to Stripe', 'error')
    }
    setConnectingStripe(false)
  }

  const handleManageStripe = async () => {
    setConnectingStripe(true)
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        showToast('Failed to open Stripe dashboard', 'error')
      }
    } catch (error) {
      showToast('Failed to open Stripe dashboard', 'error')
    }
    setConnectingStripe(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <p>Profile not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/app" className="text-white/60 hover:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
          <h1 className="text-lg font-semibold">Profile</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-medium shadow-lg`}>
          {toast.message}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar & Username */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl font-bold mb-4">
            {profile.username?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
          </div>
          {editing ? (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-white/30 text-center focus:outline-none focus:border-green-500"
              placeholder="Username"
            />
          ) : (
            <h2 className="text-2xl font-bold">{profile.username || 'No username'}</h2>
          )}
          <p className="text-white/60 mt-1">{profile.email}</p>
          <span className="mt-2 px-3 py-1 bg-white/10 rounded-full text-sm capitalize">{profile.role}</span>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <label className="text-sm text-white/60 mb-2 block">Bio</label>
          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-green-500 resize-none"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          ) : (
            <p className="text-white/80 bg-white/5 rounded-xl p-4">
              {profile.bio || 'No bio yet'}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{profile.total_spots_created}</p>
            <p className="text-sm text-white/60">Spots Created</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">${(profile.total_affiliate_earnings / 100).toFixed(2)}</p>
            <p className="text-sm text-white/60">Affiliate Earnings</p>
          </div>
        </div>

        {/* Referral Code */}
        <div className="mb-8">
          <label className="text-sm text-white/60 mb-2 block">Your Referral Code</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-lg">
              {profile.referral_code}
            </div>
            <button
              onClick={copyReferralLink}
              className="px-4 py-4 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">Share your link to earn rewards when friends sign up</p>
        </div>

        {/* Payout / Banking Info */}
        <div className="mb-8">
          <label className="text-sm text-white/60 mb-2 block">Payout Information</label>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            {affiliate?.stripe_onboarding_complete ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 font-medium">Stripe Connected</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-white">${((affiliate.total_earned_cents || 0) / 100).toFixed(2)}</p>
                    <p className="text-xs text-white/60">Total Earned</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${((affiliate.total_paid_cents || 0) / 100).toFixed(2)}</p>
                    <p className="text-xs text-white/60">Total Paid Out</p>
                  </div>
                </div>
                <button
                  onClick={handleManageStripe}
                  disabled={connectingStripe}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {connectingStripe ? 'Opening...' : 'Manage Payouts in Stripe'}
                </button>
              </div>
            ) : affiliate?.stripe_account_id ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-400 font-medium">Setup Incomplete</span>
                </div>
                <p className="text-white/60 text-sm mb-4">Complete your Stripe setup to receive payouts.</p>
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="w-full py-3 bg-[#635BFF] hover:bg-[#5851DB] rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {connectingStripe ? 'Loading...' : 'Complete Stripe Setup'}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                  <span className="text-white/60 font-medium">Not Connected</span>
                </div>
                <p className="text-white/60 text-sm mb-4">Connect your bank account to receive affiliate payouts.</p>
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="w-full py-3 bg-[#635BFF] hover:bg-[#5851DB] rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {connectingStripe ? 'Loading...' : '💳 Connect with Stripe'}
                </button>
              </div>
            )}
          </div>

          {/* PayPal / Venmo - Receive Tips */}
          <div className={`border rounded-xl p-4 mt-4 ${
            !profile.paypal_email && !profile.venmo_username 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">🔥 Receive Tips</p>
              {!profile.paypal_email && !profile.venmo_username && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">Setup Required</span>
              )}
            </div>
            {!profile.paypal_email && !profile.venmo_username && !editing && (
              <p className="text-amber-400/80 text-sm mb-3">Add your Venmo or PayPal to receive tips from your posts!</p>
            )}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Venmo Username (preferred)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">📱</span>
                    <input
                      type="text"
                      value={venmoUsername}
                      onChange={(e) => setVenmoUsername(e.target.value)}
                      placeholder="@YourUsername"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">PayPal Email</label>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">💰</span>
                    <input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">📱</span>
                  <span className="text-sm text-white/60">Venmo:</span>
                  <span className="text-sm">{profile.venmo_username || <span className="text-white/40">Not set</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">💰</span>
                  <span className="text-sm text-white/60">PayPal:</span>
                  <span className="text-sm">{profile.paypal_email || <span className="text-white/40">Not set</span>}</span>
                </div>
                {!profile.paypal_email && !profile.venmo_username && (
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
                  >
                    💰 Set Up Payments Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditing(false)
                  setUsername(profile.username || '')
                  setBio(profile.bio || '')
                  setPaypalEmail(profile.paypal_email || '')
                  setVenmoUsername(profile.venmo_username || '')
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
            >
              Edit Profile
            </button>
          )}
          
          <Link
            href="/affiliate/dashboard"
            className="block w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors text-center"
          >
            Affiliate Dashboard
          </Link>
          
          <Link
            href="/advertise/dashboard"
            className="block w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors text-center"
          >
            Advertiser Dashboard
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Member Since */}
        <p className="text-center text-white/40 text-sm mt-8">
          Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
      </main>
    </div>
  )
}
