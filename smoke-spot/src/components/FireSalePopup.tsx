'use client'

import { useState, useEffect } from 'react'

interface FireSale {
  id: string
  name: string
  deal_text: string
  creative_url: string
  click_url: string
  end_date: string
  advertiser: {
    business_name: string
    logo_url: string
  }
}

interface FireSalePopupProps {
  fireSale: FireSale
  onDismiss: () => void
  onClaim: () => void
  latitude?: number
  longitude?: number
}

export default function FireSalePopup({ fireSale, onDismiss, onClaim, latitude, longitude }: FireSalePopupProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [isAnimating, setIsAnimating] = useState(true)

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const end = new Date(fireSale.end_date).getTime()
      const diff = end - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft('EXPIRED')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`)
      } else if (mins > 0) {
        setTimeLeft(`${mins}m ${secs}s`)
      } else {
        setTimeLeft(`${secs}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [fireSale.end_date])

  // Log impression on mount
  useEffect(() => {
    fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: fireSale.id,
        event_type: 'impression',
        latitude,
        longitude,
      }),
    }).catch(() => {})
  }, [fireSale.id, latitude, longitude])

  const handleClaim = () => {
    // Log click
    fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: fireSale.id,
        event_type: 'click',
        latitude,
        longitude,
      }),
    }).catch(() => {})

    onClaim()
    if (fireSale.click_url) {
      window.open(fireSale.click_url, '_blank')
    }
  }

  if (isExpired) {
    onDismiss()
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with fire gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-orange-900/95 via-red-900/90 to-black/80 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Animated fire particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-20px',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <span className="text-2xl opacity-60">🔥</span>
          </div>
        ))}
      </div>

      {/* Main popup */}
      <div className={`relative bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-orange-500/50 transform transition-all duration-500 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Fire badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-2 rounded-full shadow-lg shadow-orange-500/50">
          <span className="text-white font-bold text-lg flex items-center gap-2">
            🔥 FIRE SALE 🔥
          </span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition"
        >
          ✕
        </button>

        {/* Content */}
        <div className="mt-6 text-center">
          {/* Business info */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {fireSale.advertiser?.logo_url ? (
              <img 
                src={fireSale.advertiser.logo_url} 
                alt={fireSale.advertiser.business_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-500/30 flex items-center justify-center text-2xl">
                🏪
              </div>
            )}
            <div className="text-left">
              <p className="text-white font-bold">{fireSale.advertiser?.business_name || 'Local Business'}</p>
              <p className="text-orange-400 text-sm">Limited Time Deal</p>
            </div>
          </div>

          {/* Deal text - the main attraction */}
          <div className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-2xl p-4 mb-4 border border-orange-500/30">
            <p className="text-3xl font-black text-white mb-2 leading-tight">
              {fireSale.deal_text || fireSale.name}
            </p>
            {fireSale.creative_url && (
              <img 
                src={fireSale.creative_url} 
                alt="Deal"
                className="w-full h-32 object-cover rounded-xl mt-3"
              />
            )}
          </div>

          {/* Countdown */}
          <div className="mb-4">
            <p className="text-orange-400 text-sm uppercase tracking-wide mb-1">Ends in</p>
            <div className="bg-black/50 rounded-xl py-3 px-6 inline-block border border-orange-500/30">
              <span className="text-3xl font-mono font-bold text-white tabular-nums">
                {timeLeft}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClaim}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white text-xl font-bold rounded-2xl shadow-lg shadow-orange-500/30 transform hover:scale-105 active:scale-95 transition-all"
          >
            🔥 CLAIM DEAL 🔥
          </button>

          <p className="text-white/40 text-xs mt-3">
            Tap to get directions • While supplies last
          </p>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  )
}
