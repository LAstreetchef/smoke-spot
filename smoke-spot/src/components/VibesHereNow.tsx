'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VibesHereNowProps {
  spotId: string
}

interface ActivePlayer {
  vibe_key: string
  vibe_name: string
  vibe_emoji: string
}

export default function VibesHereNow({ spotId }: VibesHereNowProps) {
  const [players, setPlayers] = useState<ActivePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchActivePlayers() {
      setLoading(true)
      try {
        const supabase = createClient()
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        const { data, error } = await supabase
          .from('vc_players')
          .select('vibe_key, vibe_name, vibe_emoji')
          .eq('spot_id', spotId)
          .gt('last_seen', thirtyMinAgo)

        if (!cancelled) {
          setPlayers(error ? [] : (data || []))
          setLoading(false)
        }
      } catch {
        // If vc_players table or spot_id column doesn't exist yet, fail silently
        if (!cancelled) {
          setPlayers([])
          setLoading(false)
        }
      }
    }

    fetchActivePlayers()
    return () => { cancelled = true }
  }, [spotId])

  // Find dominant vibe (most common vibe_key)
  const dominantVibe = players.length > 0
    ? Object.entries(
        players.reduce<Record<string, { count: number; name: string; emoji: string }>>((acc, p) => {
          if (!acc[p.vibe_key]) {
            acc[p.vibe_key] = { count: 0, name: p.vibe_name, emoji: p.vibe_emoji }
          }
          acc[p.vibe_key].count++
          return acc
        }, {})
      ).sort((a, b) => b[1].count - a[1].count)[0][1]
    : null

  async function handleJoinVibes() {
    const vibeKey = localStorage.getItem('vibe_key')
    const vibeName = localStorage.getItem('vibe_name')
    const vibeEmoji = localStorage.getItem('vibe_emoji')
    const userName = localStorage.getItem('vibe_username')

    // No vibe quiz completed — redirect to quiz
    if (!vibeKey || !vibeName || !vibeEmoji || !userName) {
      window.location.href = `https://vibecheck.findsmokespot.com?spot_id=${spotId}`
      return
    }

    setJoining(true)
    try {
      const res = await fetch('/api/vibecheck/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_id: spotId,
          name: userName,
          vibe_key: vibeKey,
          vibe_name: vibeName,
          vibe_emoji: vibeEmoji,
          lat: null,
          lng: null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.session_code) {
        window.location.href = `https://vibecheck.findsmokespot.com?spot_id=${spotId}&session=${data.session_code}`
      } else {
        // Fallback redirect without session
        window.location.href = `https://vibecheck.findsmokespot.com?spot_id=${spotId}`
      }
    } catch {
      window.location.href = `https://vibecheck.findsmokespot.com?spot_id=${spotId}`
    }
  }

  if (loading) {
    return (
      <div className="mt-3 py-2.5 px-3 bg-primary/30 rounded-lg animate-pulse">
        <div className="h-4 w-32 bg-neutral/10 rounded" />
      </div>
    )
  }

  const count = players.length

  return (
    <div className="mt-3 py-2.5 px-3 bg-primary/30 rounded-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {count > 0 ? (
          <>
            <span className="text-lg">{dominantVibe?.emoji}</span>
            <div className="min-w-0">
              <p className="text-neutral text-sm font-medium truncate">
                {count} {count === 1 ? 'vibe' : 'vibes'} here now
              </p>
              <p className="text-neutral/50 text-xs truncate">
                {dominantVibe?.name} energy
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="text-lg">✨</span>
            <p className="text-neutral/60 text-sm font-medium">
              BE THE FIRST VIBE HERE
            </p>
          </>
        )}
      </div>
      <button
        onClick={handleJoinVibes}
        disabled={joining}
        className="px-3 py-1.5 bg-accent/20 text-accent text-xs font-semibold rounded-full hover:bg-accent/30 transition flex-shrink-0 disabled:opacity-50"
      >
        {joining ? 'Joining...' : 'JOIN VIBES'}
      </button>
    </div>
  )
}
